import { profile, projects, experience, education, skills, personalNotes } from './content.js';

const [focusApp, shellProject, poltergeist] = projects;
const formulaElectric = experience[0];
const resumeDownload = {
  label: 'Download résumé · PDF',
  href: './assets/eric-hsu-resume.pdf',
  download: 'Eric-Hsu-Resume.pdf',
};

export const floorContent = {
  penthouse: {
    rooms: [
      { id:'a',number:'01',name:'Bedroom',title:'Bedroom',
        paragraphs:['The computer monitor opens a terminal, notes, project files and an HTML/CSS editor.'],
      },
      { id:'b',number:'02',name:'Play lounge',title:'Games',
        paragraphs:['Click the arcade machine or controller to play Snake, 2048 or Sudoku.'],
        activity:'tic-tac-toe',
      },
      { id:'c',number:'03',name:'Listening nook',title:'Music',
        paragraphs:['Click the vinyl record to open the full-screen visualizer.'],
      },
      { id:'d',number:'04',name:'Sky lounge',title:'Star atlas',
        paragraphs:['Click the telescope to browse 33 stars and seven constellations.'],
      },
    ],
  },
  about: {
    rooms: [
      {
        id: 'a',
        number: '01',
        name: 'Orientation',
        title: profile.name,
        description: `Electrical engineering at ${profile.university}, ${profile.location}.`,
        paragraphs: [
          "With McGill Formula Electric, I work on the race car's low-voltage electronics. My software projects include autonomous driving simulation, a real-time productivity application, and a UNIX shell built in C.",
        ],
      },
      {
        id: 'b',
        number: '02',
        name: 'Study',
        title: 'Engineering student',
        entries: [
          {
            title: profile.university,
            subtitle: profile.degree,
            detail: `${profile.graduation} · ${profile.location}`,
          },
        ],
      },
      {
        id: 'c',
        number: '03',
        name: 'Common room',
        title: 'Music & community',
        entries: [
          { title: 'Piano', detail: personalNotes[0].description },
          { title: 'Volunteering', detail: personalNotes[1].description },
        ],
      },
      {
        id: 'd',
        number: '04',
        name: 'Conversation',
        title: 'Languages',
        tags: ['English', 'Mandarin', 'French'],
      },
    ],
  },

  projects: {
    rooms: [
      {
        id: 'a',
        number: '01',
        name: 'Main workshop',
        projectId: focusApp.id,
        title: focusApp.title,
        status: focusApp.status,
        description: focusApp.description,
        summary: focusApp.summary,
        paragraphs: [`${focusApp.category} · ${focusApp.year}`],
        story: focusApp.story,
        images: focusApp.images,
        bullets: focusApp.bullets,
        tags: focusApp.stack,
        links: [{ label: 'View flowst8 source', href: focusApp.url }, ...focusApp.links],
      },
      {
        id: 'b',
        number: '02',
        name: 'Systems lab',
        projectId: shellProject.id,
        title: shellProject.title,
        status: shellProject.status,
        description: shellProject.description,
        summary: shellProject.summary,
        paragraphs: [shellProject.category],
        story: shellProject.story,
        bullets: shellProject.bullets,
        tags: shellProject.stack,
        links: [{ label: 'View Test-Shell source', href: shellProject.url }],
      },
      {
        id: 'c',
        number: '03',
        name: 'Simulation lab',
        projectId: poltergeist.id,
        title: poltergeist.title,
        status: poltergeist.status,
        description: poltergeist.description,
        summary: poltergeist.summary,
        paragraphs: [poltergeist.category],
        story: poltergeist.story,
        images: poltergeist.images,
        bullets: poltergeist.bullets,
        tags: poltergeist.stack,
        links: [{ label: 'View Poltergeist source', href: poltergeist.url }],
      },
    ],
  },

  experience: {
    rooms: [
      {
        id: 'a',
        number: '01',
        name: 'Electronics lab',
        title: formulaElectric.organization,
        description: formulaElectric.role,
        paragraphs: [`${formulaElectric.period} · ${formulaElectric.location}`],
        bullets: [formulaElectric.bullets[0]],
        facts: [{ value: '21%', label: 'Reduction in board area' }],
        tags: ['KiCad', 'Four-layer PCBs', 'Low-voltage electronics'],
      },
      {
        id: 'b',
        number: '02',
        name: 'Network room',
        title: 'Sensors & CAN network',
        bullets: [formulaElectric.bullets[1]],
        facts: [
          { value: '6', label: 'Integrated sensors' },
          { value: '8', label: 'CAN network nodes' },
        ],
      },
      {
        id: 'c',
        number: '03',
        name: 'Diagnostic bay',
        title: 'Electrical troubleshooting',
        bullets: [formulaElectric.bullets[2]],
        facts: [
          { value: '5', label: 'Vehicle-wide faults resolved' },
          { value: '50+', label: 'People on the multidisciplinary team' },
        ],
      },
      {
        id: 'd',
        number: '04',
        name: 'Inspection bay',
        title: 'Electrical inspection',
        bullets: [formulaElectric.bullets[3]],
        facts: [{ value: '1st', label: 'Electrical inspection attempt passed' }],
        tags: ['Formula SAE', 'Electrical testing'],
      },
    ],
    note: 'McGill Formula Electric · Electronic Systems Team · September 2025–Present',
  },

  resume: {
    rooms: [
      {
        id: 'a',
        number: '01',
        name: 'Academic archive',
        title: 'Education',
        entries: education.map(item => ({
          title: item.school,
          subtitle: item.qualification,
          detail: `${item.period} · ${item.detail}`,
        })),
      },
      {
        id: 'b',
        number: '02',
        name: 'Code library',
        title: skills[0].label,
        tags: skills[0].items,
      },
      {
        id: 'c',
        number: '03',
        name: 'Technical reference',
        title: 'Systems & engineering',
        entries: skills.slice(1).map(group => ({
          title: group.label,
          detail: group.items.join(' · '),
        })),
      },
      {
        id: 'd',
        number: '04',
        name: 'Document room',
        title: 'Résumé',
        entries: [{ title: 'Linux Foundation', detail: personalNotes[2].description }],
        links: [resumeDownload],
      },
    ],
  },

  contact: {
    rooms: [
      {
        id: 'a',
        number: '01',
        name: 'Correspondence',
        title: 'Email',
        description: profile.email,
        links: [{ label: 'Send an email', href: `mailto:${profile.email}` }],
      },
      {
        id: 'b',
        number: '02',
        name: 'Code exchange',
        title: 'GitHub',
        description: 'github.com/bshwao',
        links: [{ label: 'Explore the repositories', href: profile.github }],
      },
      {
        id: 'c',
        number: '03',
        name: 'Connections',
        title: 'LinkedIn',
        description: profile.name,
        links: [{ label: 'Connect on LinkedIn', href: profile.linkedin }],
      },
      {
        id: 'd',
        number: '04',
        name: 'Coordinates',
        title: profile.location,
        description: `${profile.university} · Electrical Engineering`,
        links: [resumeDownload],
      },
    ],
  },
};
