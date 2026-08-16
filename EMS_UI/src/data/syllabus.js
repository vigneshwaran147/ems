// ems_frontend/src/data/syllabus.js
/**
 * Static syllabus content for every certification level.
 *
 * This is deliberately not fetched from the backend: the syllabus is fixed
 * course material that changes with a curriculum revision, not with data, so
 * shipping it with the bundle keeps it available on the schedule screen and in
 * the locked exam environment without an extra round trip.
 *
 * The same objects feed both the on-screen panel and the generated PDF, so
 * there is a single source of truth for what a candidate is examined on.
 */

export const SYLLABUS_LEVELS = ['L1', 'L2', 'L3']

export const SYLLABUS = {
  L1: {
    level: 'L1',
    documentTitle: 'L1 Syllabus Modules',
    levelTitle: 'Level 1 – Foundation',
    note: 'All 10 modules are mandatory. Examination questions are drawn in proportion to the taught hours shown.',
    modules: [
      {
        ref: 'L1.01',
        title: 'Electrical Fundamentals',
        content:
          "Ohm's Law (V = IR); AC vs DC; voltage, current, resistance and power; series and parallel circuits; power calculation; open- and short-circuit conditions."
      },
      {
        ref: 'L1.02',
        title: 'Power Distribution Basics',
        content:
          'Single-phase and three-phase supply; star and delta connection; line versus phase voltage; the neutral conductor; purpose of earth grounding; earth electrodes; earth fault conditions.'
      },
      {
        ref: 'L1.03',
        title: 'Protection & Switching Devices',
        content:
          'Fuses (fast-acting, time-delay, HRC); MCB and MCCB; thermal versus magnetic tripping; ELCB and RCCB; relays and NO/NC contacts; contactors; overload relays and FLA setting.'
      },
      {
        ref: 'L1.04',
        title: 'Transformers & Power Supplies',
        content:
          'Transformer principle and turns ratio; step-up and step-down; copper and iron losses; control transformers; SMPS operation and 24 V DC panel supplies; supply protection features.'
      },
      {
        ref: 'L1.05',
        title: 'Motors & Starters — Introduction',
        content:
          'Induction motor construction; squirrel-cage rotor; slip and synchronous speed; reading a motor nameplate; DOL starters; star-delta starting principle; starting current and its consequences.'
      },
      {
        ref: 'L1.06',
        title: 'Sensors — Introduction',
        content:
          'Inductive and capacitive proximity sensors; photoelectric types (through-beam, retro-reflective, diffuse); sensing distance; PNP versus NPN outputs; two- and three-wire connection; field testing of sensors.'
      },
      {
        ref: 'L1.07',
        title: 'Cables, Panels & Drawings',
        content:
          'THHN/THWN conductors; IEC and NEC colour coding; terminal blocks and ferrules; DIN rail and wiring duct; enclosure IP ratings; single-line diagrams; control schematics; wire numbering and labelling.'
      },
      {
        ref: 'L1.08',
        title: 'SMT Foundation',
        content:
          'PCB anatomy; component identification and SMD package styles; hand soldering and basic rework; PCB handling and storage; ESD control; introduction to IPC-A-610 Class 2; visual inspection of solder joints.'
      },
      {
        ref: 'L1.09',
        title: 'Workplace & Electrical Safety',
        content:
          'Lockout/tagout procedure and verification; PPE selection; arc flash awareness; safe isolation; permit to work; multimeter CAT ratings and safe use; response to electrical incidents.'
      },
      {
        ref: 'L1.10',
        title: 'Basic Mechanics & Pneumatics',
        content:
          'Gears, belts and pulleys; bearings, couplings and lubrication; single- and double-acting pneumatic cylinders; solenoid valves; FRL units; safe depressurisation before maintenance.'
      }
    ]
  },

  L2: {
    level: 'L2',
    documentTitle: 'L2 Syllabus Modules',
    levelTitle: 'Level 2 – Intermediate',
    note: 'All 10 modules are mandatory to learn for L2 module.',
    modules: [
      {
        ref: 'L2.01',
        title: 'Power Quality & Machines',
        content:
          'Power factor, lagging and leading loads; capacitor bank correction; real, reactive and apparent power; synchronous motors; motor protection relays; single-phasing and locked-rotor protection.'
      },
      {
        ref: 'L2.02',
        title: 'Drives & Motion Control',
        content:
          'VFD architecture (rectifier, DC bus, inverter); V/f control; acceleration and deceleration ramps; EMI and harmonics; output reactors and dV/dt filters; soft starters and bypass; servo motors and encoder feedback; stepper motors and step loss.'
      },
      {
        ref: 'L2.03',
        title: 'Industrial Instrumentation',
        content:
          'RTD PT100 with 2-, 3- and 4-wire connection; thermocouple types and cold junction compensation; pressure transmitters; flow measurement (magnetic, ultrasonic, differential pressure); level measurement (float, capacitive, ultrasonic, radar, hydrostatic); 4-20 mA loops, scaling and resolution.'
      },
      {
        ref: 'L2.04',
        title: 'PLC Systems & Programming',
        content:
          'PLC architecture and scan cycle; memory types and retentivity; digital and analogue I/O modules; opto-isolation; I/O wiring and addressing; ladder logic contacts and coils; seal-in circuits; TON and TOF timers; CTU and CTD counters; electrical and software interlocks.'
      },
      {
        ref: 'L2.05',
        title: 'PLC Troubleshooting',
        content:
          'Diagnostic LEDs and fault codes; interpreting module status against program state; forcing I/O and the risks of leaving forces active; signal tracing; intermittent faults and loose terminations; program backup and restore.'
      },
      {
        ref: 'L2.06',
        title: 'Industrial Communications',
        content:
          'RS-232 versus RS-485; differential signalling and termination resistors; Modbus RTU and Modbus TCP; master-slave transactions; PROFIBUS; EtherNet/IP; IP addressing and subnet masks; baud rate and parity; switches and gateways.'
      },
      {
        ref: 'L2.07',
        title: 'Control Fundamentals',
        content:
          'Open-loop versus closed-loop control; setpoint, process variable and error; proportional, integral and derivative terms; loop tuning and overshoot; final control elements; HMI screen and tag configuration.'
      },
      {
        ref: 'L2.08',
        title: 'SMT Process Engineering',
        content:
          'Stencil design and solder paste printing; solder paste inspection (SPI); pick and place; reflow profiling and thermal zones; wave and selective soldering; automated optical inspection (AOI); X-ray for BGA; defect taxonomy (tombstoning, bridging, voiding, head-in-pillow); rework and repair; IPC-A-610 Class 3.'
      },
      {
        ref: 'L2.09',
        title: 'Cables, EMI & Panel Engineering',
        content:
          'SWA and tray cable; Belden instrumentation cable; symmetrical shielded VFD motor cable; shield grounding practice and ground loops; segregation of power and signal wiring; strain relief and connector integrity.'
      },
      {
        ref: 'L2.10',
        title: 'Structured Fault Finding',
        content:
          'Fault-finding methodology; the half-split technique; evidence gathering before component replacement; use of drawings in diagnosis; recording and closing out faults.'
      }
    ]
  },

  L3: {
    level: 'L3',
    documentTitle: 'L3 Syllabus Modules',
    levelTitle: 'Level 3 – Advanced',
    note: 'All 10 modules are mandatory to learn for this L3 module.',
    modules: [
      {
        ref: 'L3.01',
        title: 'Line Qualification & Process Validation',
        content:
          'Installation, operational and performance qualification (IQ/OQ/PQ); machine capability studies; process capability Cp and Cpk; gauge repeatability and reproducibility; first article inspection; writing and executing validation protocols.'
      },
      {
        ref: 'L3.02',
        title: 'Statistical Process Control & Six Sigma',
        content:
          'Control charts and rule sets; control limits versus specification limits; DMAIC structure; introduction to design of experiments; yield and DPMO analysis; driving corrective action from statistical signals.'
      },
      {
        ref: 'L3.03',
        title: 'Failure Analysis & Root Cause',
        content:
          '8D methodology; Ishikawa and 5-why analysis; X-ray and cross-sectioning; dye and pry testing; solder joint metallurgy and intermetallic growth; thermal cycling and mechanical failure modes; escalation and containment.'
      },
      {
        ref: 'L3.04',
        title: 'DFM / DFT Leadership',
        content:
          'Design for manufacture review process; pad and land pattern assessment; panelisation and fiducials; design for test; in-circuit test versus flying probe versus boundary scan; structuring effective DFM feedback to design teams.'
      },
      {
        ref: 'L3.05',
        title: 'New Product Introduction Management',
        content:
          'NPI stage gates; prototype to volume transition; BOM and approved vendor list control; engineering change order management; supplier qualification; ramp planning and capacity modelling.'
      },
      {
        ref: 'L3.06',
        title: 'Advanced Control, SCADA & Data',
        content:
          'Cascade and advanced PID strategies; SCADA architecture and RTUs; historians and long-term trending; alarm rationalisation and prevention of alarm flooding; OEE and production data monitoring; machine virtualisation and digital twin concepts.'
      },
      {
        ref: 'L3.07',
        title: 'Network Architecture & OT Security',
        content:
          'Topology design and redundancy protocols; managed switches and VLANs; IP addressing scheme design; gateways and protocol conversion; OT cybersecurity principles; network segmentation; patching and change control in live production.'
      },
      {
        ref: 'L3.08',
        title: 'Robotics & Advanced Automation',
        content:
          'Robot types and degrees of freedom; end effectors; encoder and resolver feedback; teach pendant programming; work cell integration; light curtains and safety-rated stop categories; risk assessment for robot cells.'
      },
      {
        ref: 'L3.09',
        title: 'Power Quality, Energy & Compliance',
        content:
          'Harmonic distortion from drives and mitigation; power factor penalties and correction economics; earthing and bonding to standard; energy audits; thermographic survey interpretation.'
      },
      {
        ref: 'L3.10',
        title: 'Audit, Compliance & Technical Leadership',
        content:
          'IPC audit preparation and evidence packs; ownership of the site LOTO programme; risk assessment methodology; training, mentoring and competency matrices; documentation and revision control; leading continuous improvement.'
      }
    ]
  }
}

/** Returns the syllabus for a certification level, or null for an unknown level. */
export const getSyllabus = (level) => SYLLABUS[level] || null
