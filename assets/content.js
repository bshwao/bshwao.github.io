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
      "From a real-time focus application to a UNIX shell in C: a look at what I have been building.",
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
    title: "flowst8",
    category: "Contributor · Team of three · Hack The Hill III",
    year: "September 2026",
    description:
      "A real-time productivity application designed to calculate dynamic focus scores, detect developer fatigue, and prompt timely breaks.",
    bullets: [
      "Built an end-to-end Python, FastAPI, and WebSocket pipeline to synchronize keystrokes per minute with live Apple Watch heart-rate telemetry.",
      "Containerized microservices with Docker and used TimescaleDB for continuous time-series storage.",
      "Integrated ElevenLabs audio alerts and connected the HTML/Next frontend with the Python/TypeScript backend.",
    ],
    stack: ["Python", "FastAPI", "WebSockets", "TypeScript", "Next", "Docker", "TimescaleDB"],
    url: "https://github.com/ric-e/flowst8",
  },
  {
    title: "Test-Shell",
    category: "UNIX CLI shell simulator",
    year: "",
    description:
      "A lightweight UNIX command-line interpreter in C, built to explore core operating-system interactions and essential shell functionality.",
    bullets: [
      "Used POSIX fork, execvp, and wait calls to create processes, execute child processes, and manage synchronization.",
      "Implemented argument parsing and memory management to prevent leaks and mitigate zombie processes.",
    ],
    stack: ["C", "POSIX", "UNIX", "Process management"],
    url: "https://github.com/bshwao/Test-Shell",
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
