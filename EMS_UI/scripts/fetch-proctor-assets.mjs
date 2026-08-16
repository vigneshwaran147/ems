#!/usr/bin/env node
/**
 * Vendors the AI proctoring engine (libraries + model weights) into public/.
 *
 * WHY THIS EXISTS
 * ---------------
 * The proctoring worker used to pull TensorFlow.js and its model weights from
 * public CDNs at exam time. For a secure exam portal that is three problems:
 *
 *   1. A candidate who blocks a CDN hostname disables proctoring entirely,
 *      while the exam itself carries on working.
 *   2. First-load latency (~25MB over the public internet) is paid by every
 *      candidate on their slowest, most stressful minute.
 *   3. Upstream hosts disappear. face-landmarks-detection@1.0.6 has tfhub.dev
 *      URLs compiled into it, and tfhub.dev was retired in favour of Kaggle
 *      Models — so face/gaze tracking silently degraded to "unavailable" with
 *      no way to notice from the outside.
 *
 * Everything is served same-origin after this runs, so the engine works
 * offline, cannot be selectively blocked, and is version-pinned by
 * package.json + this file rather than by whatever a CDN serves today.
 *
 * Run: npm run fetch:proctor-assets
 */

import { createWriteStream } from 'node:fs'
import { mkdir, readFile, writeFile, rm, readdir, copyFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const HERE = dirname(fileURLToPath(import.meta.url))
const UI_ROOT = resolve(HERE, '..')
const PUBLIC = join(UI_ROOT, 'public')
const VENDOR = join(PUBLIC, 'vendor', 'tfjs')
const MODELS = join(PUBLIC, 'models')
const NODE_MODULES = join(UI_ROOT, 'node_modules')

/** UMD bundles + WASM binaries copied straight out of node_modules. */
const VENDOR_FILES = [
  '@tensorflow/tfjs/dist/tf.min.js',
  '@tensorflow/tfjs-backend-wasm/dist/tf-backend-wasm.min.js',
  '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm',
  '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-simd.wasm',
  '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-threaded-simd.wasm',
  '@tensorflow-models/coco-ssd/dist/coco-ssd.min.js',
  '@tensorflow-models/face-landmarks-detection/dist/face-landmarks-detection.min.js'
]

/**
 * Graph models hosted as model.json + binary weight shards. The shard names
 * are read out of the manifest rather than guessed, because they differ per
 * model and change between revisions.
 */
const GRAPH_MODELS = [
  {
    name: 'coco-ssd',
    dir: join(MODELS, 'coco-ssd'),
    // ssdlite, not the full ssd_mobilenet_v2: measured, the full base is 65MB
    // against 17MB for lite. That is not a defensible cost to push at every
    // candidate, and it was never the real fix for missed phone detections —
    // that was a threshold bug where the model's own cutoff discarded
    // low-scoring boxes before our per-class filter ever saw them. See
    // runPhoneTask() in proctor.worker.js.
    modelJson: 'https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/model.json'
  }
]

/**
 * MediaPipe models, distributed by Kaggle as tar.gz archives since the
 * tfhub.dev retirement. Each unpacks to a model.json + shards.
 */
const KAGGLE_MODELS = [
  {
    name: 'face-detection',
    dir: join(MODELS, 'face-detection'),
    url: 'https://www.kaggle.com/models/mediapipe/face-detection/TfJs/short/1/download?format=tfjs'
  },
  {
    name: 'face-mesh',
    dir: join(MODELS, 'face-mesh'),
    // attention_mesh, not face_mesh: it carries the iris landmarks that make
    // real gaze tracking (eyes moving off-screen while the head stays put)
    // possible. Costs a larger download; see notes in proctor.worker.js.
    url: 'https://www.kaggle.com/models/mediapipe/face-landmarks-detection/TfJs/attention-mesh/1/download?format=tfjs'
  }
]

function log(message) {
  process.stdout.write(`${message}\n`)
}

async function download(url, destination) {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) {
    throw new Error(`GET ${url} -> HTTP ${response.status}`)
  }
  await mkdir(dirname(destination), { recursive: true })
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination))
  const { size } = await stat(destination)
  return size
}

async function copyVendorFiles() {
  log('\nVendoring libraries from node_modules...')
  await mkdir(VENDOR, { recursive: true })

  for (const relative of VENDOR_FILES) {
    const source = join(NODE_MODULES, relative)
    const target = join(VENDOR, relative.split('/').pop())
    try {
      await copyFile(source, target)
      const { size } = await stat(target)
      log(`  ok  ${relative.split('/').pop().padEnd(38)} ${(size / 1024).toFixed(0)} KB`)
    } catch (error) {
      throw new Error(
        `Missing ${relative}. Run "npm install" first.\n  underlying: ${error.message}`
      )
    }
  }
}

/** Downloads model.json plus every shard it references. */
async function fetchGraphModel({ name, dir, modelJson }) {
  log(`\nFetching ${name}...`)
  await mkdir(dir, { recursive: true })

  const manifestPath = join(dir, 'model.json')
  await download(modelJson, manifestPath)

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const shards = (manifest.weightsManifest || []).flatMap((group) => group.paths || [])

  if (shards.length === 0) {
    throw new Error(`${name}: model.json declared no weight shards; refusing to ship a broken model`)
  }

  const base = modelJson.slice(0, modelJson.lastIndexOf('/') + 1)
  let total = 0
  for (const shard of shards) {
    total += await download(base + shard, join(dir, shard))
  }
  log(`  ok  model.json + ${shards.length} shard(s), ${(total / 1024 / 1024).toFixed(1)} MB`)
}

/** Downloads a Kaggle tar.gz bundle and flattens it into `dir`. */
async function fetchKaggleModel({ name, dir, url }) {
  log(`\nFetching ${name}...`)
  await mkdir(dir, { recursive: true })

  const archive = join(dir, '_download.tar.gz')
  const bytes = await download(url, archive)

  // Kaggle answers a blocked/unauthenticated request with an HTML page and a
  // 200, so size is the cheap tell before we hand it to tar.
  if (bytes < 10_000) {
    await rm(archive, { force: true })
    throw new Error(
      `${name}: archive was only ${bytes} bytes — Kaggle likely returned an HTML page instead of the model.`
    )
  }

  await execFileAsync('tar', ['-xzf', archive, '-C', dir])
  await rm(archive, { force: true })

  const entries = await readdir(dir)
  if (!entries.includes('model.json')) {
    throw new Error(`${name}: extracted archive has no model.json (found: ${entries.join(', ')})`)
  }
  log(`  ok  ${entries.length} file(s) extracted`)
}

/**
 * Writes a manifest the worker fetches at startup.
 *
 * Lets the worker fail loudly with "assets not vendored — run
 * npm run fetch:proctor-assets" instead of emitting a wall of confusing 404s.
 */
async function writeManifest() {
  const manifest = {
    generatedAt: new Date().toISOString(),
    note: 'Generated by scripts/fetch-proctor-assets.mjs. Do not edit by hand.',
    vendor: '/vendor/tfjs/',
    models: {
      cocoSsd: '/models/coco-ssd/model.json',
      faceDetector: '/models/face-detection/model.json',
      faceMesh: '/models/face-mesh/model.json'
    }
  }
  await writeFile(join(PUBLIC, 'models', 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  log('\nWrote public/models/manifest.json')
}

async function main() {
  log('Vendoring AI proctoring assets into public/')

  await copyVendorFiles()

  for (const model of GRAPH_MODELS) {
    await fetchGraphModel(model)
  }

  for (const model of KAGGLE_MODELS) {
    await fetchKaggleModel(model)
  }

  await writeManifest()
  log('\nDone. The proctoring engine now loads entirely same-origin.')
}

main().catch((error) => {
  process.stderr.write(`\nFAILED: ${error.message}\n`)
  process.exitCode = 1
})
