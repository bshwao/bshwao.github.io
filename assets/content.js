export const profile = {
  name: "Eric Hsu",
  location: "Montréal, QC",
  email: "erichsu8681@gmail.com",
  github: "https://github.com/bshwao",
  linkedin: "https://www.linkedin.com/in/erichsu07/",
  degree: "Bachelor of Engineering, Electrical Engineering",
  university: "McGill University",
  graduation: "Expected 2030",
};

export const rooms = [
  {
    id: 'penthouse', number: '06', name: 'Penthouse', title: 'Penthouse',
    eyebrow: 'Penthouse', description: 'Music, games, desktop tools, room settings and a star atlas.',
  },
  {
    id: "about",
    number: "01",
    name: "About",
    title: "About Eric",
    eyebrow: "About Eric",
    description:
      "Electrical engineering student at McGill University in Montréal.",
  },
  {
    id: "projects",
    number: "02",
    name: "Projects",
    title: "Projects",
    eyebrow: "Selected projects",
    description:
      "Autonomous driving simulation, a real-time focus dashboard, and a UNIX shell in C.",
  },
  {
    id: "experience",
    number: "03",
    name: "Experience",
    title: "Engineering experience",
    eyebrow: "Experience",
    description:
      "PCBs, sensors, CAN networks, and electrical testing with McGill Formula Electric.",
  },
  {
    id: "resume",
    number: "04",
    name: "Résumé",
    title: "Education & skills",
    eyebrow: "Education & skills",
    description:
      "Education, programming languages, engineering tools, and résumé download.",
  },
  {
    id: "contact",
    number: "05",
    name: "Contact",
    title: "Contact",
    eyebrow: "Contact",
    description:
      "Email, GitHub, and LinkedIn.",
  },
];

export const projects = [
  {
    id: "flowst8",
    title: "flowst8",
    status: "complete",
    category: "Contributor · Team of three · Hack The Hill III",
    year: "September 2026",
    description:
      "A real-time focus dashboard using Apple Watch heart-rate data and keyboard activity, with fatigue estimates and break alerts.",
    summary: {
      built: "A focus dashboard using Apple Watch heart-rate data and keyboard activity.",
      contribution: "Backend services and frontend–backend integration.",
      result: "A hackathon prototype with live data, focus scores, and audio alerts.",
    },
    story: [
      {
        title: "Hackathon scope",
        text: "We prioritized connecting wearable data, backend services, and the dashboard over UI polish to meet the hackathon deadline.",
      },
    ],
    bullets: [
      "Python, FastAPI, and WebSockets connect keyboard activity with Apple Watch heart-rate data ingested through Pulsoid.",
      "Docker connects the services, with TimescaleDB storing the incoming time-series data.",
      "The frontend presents the live signals and focus state, with ElevenLabs audio alerts supporting the notification flow.",
    ],
    stack: ["Python", "FastAPI", "WebSockets", "TypeScript", "Next.js", "Docker", "TimescaleDB"],
    url: "https://github.com/ric-e/flowst8",
    links: [{ label: "View the Devpost submission", href: "https://devpost.com/software/larp-the-north" }],
    images: [
      {
        src: "./assets/projects/flowst8/focus-dashboard.png",
        alt: "flowst8 dashboard showing focus score, heart-rate signals, keyboard activity, and a heart-rate trace",
        caption: "Live signals, estimated focus score, and heart-rate trace.",
        width: 806, height: 328,
      },
      {
        src: "./assets/projects/flowst8/event-stream.png",
        alt: "flowst8 event stream showing repeated heart-rate connection messages",
        caption: "Heart-rate connection events during integration debugging.",
        width: 806, height: 328,
      },
      {
        src: "./assets/projects/flowst8/watch-capture.png",
        alt: "Apple Watch showing an active heart-rate capture session",
        caption: "Apple Watch heart-rate capture during the prototype demonstration.",
        width: 374, height: 573,
      },
      {
        src: "./assets/projects/flowst8/heart-rate-connection.png",
        alt: "Heart-rate broadcasting interface showing an active connection and session statistics",
        caption: "The companion broadcasting interface used to check the heart-rate connection.",
        width: 542, height: 573,
      },
    ],
  },
  {
    id: "test-shell",
    title: "Test-Shell",
    status: "complete",
    category: "Personal C programming exercise",
    year: "",
    description:
      "A small Bash-like command interpreter written in C to practice command parsing, POSIX processes, and file descriptors.",
    summary: {
      built: "A compact UNIX command interpreter in C with built-ins, pipelines, redirection, and background execution.",
      contribution: "A self-directed implementation to practice command parsing, POSIX processes, pipes, and file descriptors.",
      result: "Completed a working shell with nine built-in commands and external command execution.",
    },
    bullets: [
      "Implemented nine built-in commands, including cd, pwd, echo, env, export, and history.",
      "Used fork, execvp, and waitpid for external commands, with pipe and dup2 connecting command pipelines.",
      "Added argument parsing, basic I/O redirection, background execution, and cleanup of command allocations.",
    ],
    stack: ["C", "POSIX", "UNIX", "Process management"],
    url: "https://github.com/bshwao/Test-Shell",
  },
  {
    id: "poltergeist",
    title: "Poltergeist",
    status: "ongoing",
    category: "Autonomous driving simulation & evaluation",
    year: "",
    description:
      "A CARLA-based platform for creating hazardous driving scenarios, evaluating autonomous agents, and reviewing telemetry, sensor recordings, and failure evidence.",
    summary: {
      built: "A CARLA scenario runner and dashboard for evaluating autonomous driving agents.",
      contribution: "Scenario setup, simulator measurements, and the dashboard for reviewing recorded runs.",
      result: "Local runs with matched seeds, camera/LiDAR recordings, and behavior reports. Development is ongoing.",
    },
    story: [
      {
        title: "Intended users",
        text: "I’m building this to pitch a repeatable stress-testing platform to autonomous-driving companies and startups.",
      },
      {
        title: "Simulation measurements",
        text: "I use CARLA position, speed, and timing data to calculate braking, stopping distance, clearance, and time to collision. The dashboard keeps units and unavailable measurements explicit.",
      },
    ],
    bullets: [
      "Built a React and TypeScript dashboard with a FastAPI backend to create, save, validate, and execute parameterized driving scenarios.",
      "Implemented repeatable agent comparisons with matched seeds, failure search, reproduction, and scenario minimization.",
      "Linked agent observations and proposed/applied controls to telemetry, synchronized RGB camera and LiDAR recordings, and behavior reports.",
      "Integrated a Python agent SDK and pretrained PlanT 2.0 reference controller for local driving experiments.",
    ],
    stack: ["Python", "FastAPI", "React", "TypeScript", "CARLA", "SQLite", "Pydantic"],
    url: "https://github.com/bshwao/Poltergeist",
    images: [
      {
        src: "./assets/projects/poltergeist/scenario-workspace.png",
        alt: "Poltergeist scenario workspace with map selection, seeded parameters, recipe validation, and execution settings",
        caption: "Scenario setup: map selection, seeded parameters, validation, and execution settings.",
        width: 1280, height: 3583, preview: "top",
      },
      {
        src: "./assets/projects/poltergeist/experiment-comparison.png",
        alt: "Poltergeist experiment comparison dashboard with matched-agent results and evidence exports",
        caption: "Agent comparison using synthetic integration-test data, illustrating the workflow rather than a real-world driving result.",
        width: 1280, height: 4647, preview: "top",
      },
      {
        src: "./assets/projects/poltergeist/decision-review.jpg",
        alt: "Poltergeist decision review linking an agent input to applied controls and the following measured response",
        caption: "Frame-linked decision review from a deterministic synthetic fixture: inputs, applied controls, and measured response.",
        width: 1265, height: 712,
      },
      {
        src: "./assets/projects/poltergeist/carla-camera-frame.png",
        alt: "RGB camera sensor frame captured from a vehicle in CARLA",
        caption: "An RGB sensor frame from a documented live CARLA 0.9.16 integration run.",
        width: 320, height: 180,
      },
    ],
  },
];

export const experience = [
  {
    organization: "McGill Formula Electric",
    role: "Electronic Systems Team Member",
    location: "Montréal, QC",
    period: "September 2025 – Present",
    bullets: [
      "Designed and tested four-layer KiCad PCBs for the race car's low-voltage system, reducing board area by 21% while meeting signal-integrity requirements.",
      "Integrated six sensors and built a CAN network across eight nodes, eliminating dropped messages during track testing.",
      "Diagnosed and resolved five vehicle-wide electrical faults with a multidisciplinary team of more than 50 people.",
      "Verified electrical systems against Formula SAE technical requirements and passed electrical inspection on the first attempt.",
    ],
  },
];

export const education = [
  {
    school: "McGill University",
    qualification: "Bachelor of Engineering, Electrical Engineering",
    period: "Expected 2030",
    detail: "Montréal, QC",
  },
  {
    school: "Richmond Hill High School",
    qualification: "Ontario Secondary School Diploma",
    period: "2025",
    detail: "GPA: 97.5% · Honour Roll, Grades 9–12 · Richmond Hill, ON",
  },
];

export const skills = [
  {
    label: "Programming",
    items: ["Python", "C", "C++", "Java", "JavaScript", "TypeScript", "Bash / Shell", "SQL", "HTML"],
  },
  {
    label: "Systems & tools",
    items: ["Linux", "UNIX", "Git", "Docker", "Node.js", "Verilog / SystemVerilog", "UVM", "CARLA", "CAD"],
  },
  {
    label: "Electrical engineering",
    items: [
      "Circuit analysis",
      "Digital logic design",
      "Microcontrollers",
      "PCB design",
      "Electronic testing & troubleshooting",
      "Oscilloscopes & multimeters",
      "Hardware-software integration",
      "Memory controllers",
      "Breadboarding",
      "Technical documentation",
    ],
  },
];

export const personalNotes = [
  {
    title: "Piano",
    description: "Royal Conservatory of Music Level 10 Piano with Honors.",
  },
  {
    title: "Volunteering",
    description: "Volunteered at McHacks 13 and McGill TechFair.",
  },
  {
    title: "Linux certification",
    description: "LFS101 certification from the Linux Foundation.",
  },
  {
    title: "Languages",
    description: "English, Mandarin, and French.",
  },
];
