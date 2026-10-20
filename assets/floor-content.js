import { profile, projects, experience, education, skills, personalNotes } from './content.js';

const [focusApp, shellProject] = projects;
const formulaElectric = experience[0];
const resumeDownload = {
  label: 'Download résumé · PDF',
  href: './assets/eric-hsu-resume.pdf',
  download: 'Eric-Hsu-Resume.pdf',
};

export const floorContent = {
  about: {
    rooms: [
      {
        id: 'a',
        number: '01',
        name: 'Orientation',
        title: profile.name,
        description: `Electrical engineering at ${profile.university}, ${profile.location}.`,
        paragraphs: [
          'My work spans circuits and code: designing circuit boards, connecting sensors, and building software that makes systems work together.',
          "With McGill Formula Electric, I work on the race car's low-voltage electronics. My software projects include a real-time productivity application and a UNIX shell built in C.",
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
          { title: 'At the piano', detail: personalNotes[0].description },
          { title: 'Around the community', detail: personalNotes[1].description },
        ],
      },
      {
        id: 'd',
        number: '04',
        name: 'Conversation',
        title: 'Languages',
        description: personalNotes[3].description,
        tags: ['English', 'Mandarin', 'French'],
      },
    ],
    note: 'An introduction, in four rooms.',
  },

  projects: {
    rooms: [
      {
        id: 'a',
        number: '01',
        name: 'Main workshop',
        title: focusApp.title,
        description: focusApp.description,
        paragraphs: [`${focusApp.category} · ${focusApp.year}`],
        bullets: focusApp.bullets,
        links: [{ label: 'View flowst8 source', href: focusApp.url }],
      },
      {
        id: 'b',
        number: '02',
        name: 'Systems lab',
        title: shellProject.title,
        description: shellProject.description,
        paragraphs: [shellProject.category],
        bullets: shellProject.bullets,
        links: [{ label: 'View Test-Shell source', href: shellProject.url }],
      },
      {
        id: 'c',
        number: '03',
        name: 'Materials library',
        title: 'The toolkit',
        description: 'Technologies used across these two builds.',
        entries: [
          { title: focusApp.title, detail: focusApp.stack.join(' · ') },
          { title: shellProject.title, detail: shellProject.stack.join(' · ') },
        ],
      },
    ],
    note: 'Selected work across real-time applications and operating systems.',
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
        title: 'Connected systems',
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
        title: 'Finding the fault',
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
        title: 'Verified for the track',
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
        title: 'The résumé',
        description: 'Download the complete résumé for experience, projects, education, skills, and activities.',
        entries: [{ title: 'Linux Foundation', detail: personalNotes[2].description }],
        links: [resumeDownload],
      },
    ],
    note: 'Education, technical skills, and the complete résumé.',
  },

  contact: {
    rooms: [
      {
        id: 'a',
        number: '01',
        name: 'Correspondence',
        title: 'Write a note',
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
    note: 'A place to start the conversation.',
  },
};
