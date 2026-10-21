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
    id: "about",
    number: "01",
    name: "About",
    title: "A little introduction.",
    eyebrow: "About Eric",
    description:
      "Electrical engineering at McGill. An interest in the systems where hardware and software meet.",
  },
  {
    id: "projects",
    number: "02",
    name: "Projects",
    title: "Ideas, put to work.",
    eyebrow: "Selected projects",
    description:
      "Driving simulations, a real-time focus application, and a UNIX shell in C: a look at what I have been building.",
  },
  {
    id: "experience",
    number: "03",
    name: "Experience",
    title: "Engineering in practice.",
    eyebrow: "Experience",
    description:
      "PCBs, sensors, CAN networks, and electrical testing with McGill Formula Electric.",
  },
  {
    id: "resume",
    number: "04",
    name: "Résumé",
    title: "The details, on paper.",
    eyebrow: "Education & skills",
    description:
      "My education, technical toolkit, and résumé, collected in one place.",
  },
  {
    id: "contact",
    number: "05",
    name: "Contact",
    title: "Start a conversation.",
    eyebrow: "Contact",
    description:
      "Find me in Montréal, write me an email, or connect through GitHub and LinkedIn.",
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
      "A real-time productivity application designed to calculate dynamic focus scores, detect developer fatigue, and prompt timely breaks.",
    story: [
      {
        title: "My contribution",
        text: "I worked mainly on the backend and the connection between the frontend and backend, bringing separately developed components together into a usable application.",
      },
      {
        title: "Building against the clock",
        text: "The hackathon deadline left little time for polish or repeated revision. We prioritized getting the wearable data, backend services, and interface working together as one end-to-end prototype.",
      },
      {
        title: "What we delivered",
        text: "A working prototype that brings heart-rate and keyboard activity into a live focus dashboard and alerts. The experience taught me how much practical debugging and coordination it takes to connect independently built parts.",
      },
    ],
    bullets: [
      "Python, FastAPI, and WebSockets connect keyboard activity with Apple Watch heart-rate data ingested through Pulsoid.",
      "Docker connects the services, with TimescaleDB storing the incoming time-series data.",
      "The frontend presents the live signals and focus state, with ElevenLabs audio alerts supporting the notification flow.",
    ],
    stack: ["Python", "FastAPI", "WebSockets", "TypeScript", "Next", "Docker", "TimescaleDB"],
    url: "https://github.com/ric-e/flowst8",
    links: [{ label: "View the Devpost submission", href: "https://devpost.com/software/larp-the-north" }],
    images: [
      {
        src: "./assets/projects/flowst8/focus-dashboard.png",
        alt: "flowst8 dashboard showing focus score, heart-rate signals, keyboard activity, and a heart-rate trace",
        caption: "The prototype dashboard brings the incoming signals and estimated focus state into one view.",
        width: 806, height: 328,
      },
      {
        src: "./assets/projects/flowst8/event-stream.png",
        alt: "flowst8 event stream showing repeated heart-rate connection messages",
        caption: "Connection events made the frontend and backend integration visible while debugging.",
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
    story: [
      {
        title: "Why I built it",
        text: "I started Test-Shell as a short, self-directed project to test my C programming skills and understand what happens between entering a command and seeing a program run.",
      },
      {
        title: "A deliberately small scope",
        text: "The aim was to explore a useful subset of shell behavior. It supports common built-ins, external commands, pipelines, and basic redirection, without attempting to reproduce all of Bash.",
      },
      {
        title: "What I practiced",
        text: "The project gave me a concrete way to work with child processes, pipes, file descriptors, argument parsing, and cleanup after each command. The emphasis was hands-on learning through a compact implementation.",
      },
    ],
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
    story: [
      {
        title: "Who I am building it for",
        text: "I started Poltergeist with the goal of pitching a repeatable stress-testing platform to autonomous driving companies and smaller startups. The idea is to give different models a common set of challenging conditions and make their responses easier to compare.",
      },
      {
        title: "From simulator physics to useful measurements",
        text: "The biggest engineering challenge was understanding CARLA's vehicle motion and translating it into meaningful dashboard values. That meant connecting position, speed, and timing data to braking, stopping, clearance, and time-to-collision calculations, while keeping units and unavailable measurements explicit.",
      },
      {
        title: "What the platform makes possible",
        text: "The current local workflow brings scenario setup, agent execution, recorded evidence, and behavior review together. It gives a team a repeatable starting point for investigating failures and comparing model versions under controlled conditions.",
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
        caption: "Scenario setup: map selection, seeded parameters, validation, and execution settings. Open the full image to explore the workspace.",
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
    title: "Away from the workbench",
    description: "Royal Conservatory of Music Level 10 Piano with Honors.",
  },
  {
    title: "Around the community",
    description: "Volunteered at McHacks 13 and McGill TechFair.",
  },
  {
    title: "Always learning",
    description: "LFS101 certification from the Linux Foundation.",
  },
  {
    title: "In conversation",
    description: "English, Mandarin, and French.",
  },
];
