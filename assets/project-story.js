const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export function renderProjectStatus(status) {
  const label = status === 'ongoing' ? 'Ongoing' : status === 'complete' ? 'Complete' : null;
  return label ? `<span class="project-status" data-status="${status}">${label}</span>` : '';
}

export function renderCaseStudyLink(projectId) {
  return projectId ? `<a class="project-reading-link" href="./reading.html#project-${encodeURIComponent(projectId)}">Read full case study ↗</a>` : '';
}

export function renderStory(story = []) {
  if (!story.length) return '';
  return `<div class="project-story">${story.map(item => `<section class="project-story-note"><h4>${escape(item.title)}</h4><p>${escape(item.text)}</p></section>`).join('')}</div>`;
}

export function renderGallery(images = []) {
  if (!images.length) return '';
  return `<div class="project-gallery" aria-label="Project images">${images.map(image => {
    const width = Number(image.width), height = Number(image.height);
    const sized = Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0;
    const preview = image.preview === 'top';
    return `<figure class="project-image${sized && height > width ? ' is-portrait' : ''}${preview ? ' is-preview-top' : ''}"><a class="project-image-link" href="${escape(image.src)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(`Open full image: ${image.alt}`)}"><img src="${escape(image.src)}" alt="${escape(image.alt)}"${sized ? ` width="${width}" height="${height}"` : ''} loading="lazy" decoding="async">${preview ? '<span class="project-image-action" aria-hidden="true">Open full image ↗</span>' : ''}</a>${image.caption ? `<figcaption>${escape(image.caption)}</figcaption>` : ''}</figure>`;
  }).join('')}</div>`;
}
