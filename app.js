'use strict';
const content = window.CAAB_CONTENT;
const gallery = document.querySelector('#gallery-grid');
const lightbox = document.querySelector('#lightbox');
const photoImage = document.querySelector('#lightbox-image');
let photoIndex = 0;
const assetPath = (id, small = false) => `assets/reception-${String(id).padStart(2, '0')}${small ? '-small' : ''}.webp`;
const arrowIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/></svg>';

function updatePhoto() {
  const photo = content.photos[photoIndex];
  photoImage.src = assetPath(photo.id);
  photoImage.alt = photo.alt;
  document.querySelector('#lightbox-counter').textContent = `${photoIndex + 1} / ${content.photos.length} — Une réalisation CAAB`;
  document.querySelector('#lightbox-caption').textContent = photo.caption;
}
function showPhoto(id) {
  photoIndex = content.photos.findIndex(photo => photo.id === id);
  updatePhoto();
  if (!lightbox.open) lightbox.showModal();
}
function renderGallery(scene) {
  gallery.replaceChildren();
  content.scenes[scene].forEach(id => {
    const photo = content.photos.find(item => item.id === id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gallery-tile';
    button.setAttribute('aria-label', `Agrandir : ${photo.caption}`);
    const img = document.createElement('img');
    img.src = assetPath(id, true);
    img.srcset = `${assetPath(id, true)} 600w, ${assetPath(id)} 1200w`;
    img.sizes = '(max-width: 760px) 90vw, 45vw';
    img.alt = photo.alt;
    img.loading = 'lazy';
    img.width = 600;
    img.height = id === 9 ? 400 : 900;
    const icon = document.createElement('span');
    icon.className = 'image-open';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = arrowIcon;
    button.append(img, icon);
    button.addEventListener('click', () => showPhoto(id));
    gallery.append(button);
  });
}
document.querySelectorAll('[data-scene]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-scene]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
    renderGallery(button.dataset.scene);
  });
});
renderGallery('day');
document.querySelector('#view-all').addEventListener('click', () => showPhoto(1));
document.querySelector('#lightbox-close').addEventListener('click', () => lightbox.close());
document.querySelector('#photo-prev').addEventListener('click', () => { photoIndex = (photoIndex - 1 + content.photos.length) % content.photos.length; updatePhoto(); });
document.querySelector('#photo-next').addEventListener('click', () => { photoIndex = (photoIndex + 1) % content.photos.length; updatePhoto(); });
lightbox.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') { event.preventDefault(); document.querySelector('#photo-prev').click(); }
  if (event.key === 'ArrowRight') { event.preventDefault(); document.querySelector('#photo-next').click(); }
});
let touchStartX = null;
photoImage.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].screenX; }, {passive: true});
photoImage.addEventListener('touchend', event => {
  if (touchStartX === null) return;
  const delta = event.changedTouches[0].screenX - touchStartX;
  if (Math.abs(delta) > 60) document.querySelector(delta > 0 ? '#photo-prev' : '#photo-next').click();
  touchStartX = null;
}, {passive: true});

const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
function closeMenu() { toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Ouvrir le menu'); nav.classList.remove('is-open'); }
toggle.addEventListener('click', () => {
  const opening = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(opening));
  toggle.setAttribute('aria-label', opening ? 'Fermer le menu' : 'Ouvrir le menu');
  nav.classList.toggle('is-open', opening);
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { closeMenu(); toggle.focus(); } });
window.matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

const form = document.querySelector('#quote-form');
const date = document.querySelector('#event-date');
const now = new Date();
date.min = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
form.addEventListener('submit', event => {
  event.preventDefault();
  const fields = new FormData(form);
  const result = document.querySelector('#form-result');
  const selectedDate = fields.get('date') ? new Intl.DateTimeFormat('fr-FR', {dateStyle:'long'}).format(new Date(`${fields.get('date')}T12:00:00`)) : 'Date à préciser';
  result.textContent = `Voici l’aperçu de votre projet, ${fields.get('name')}.\n\n${fields.get('event')} · ${fields.get('place')}\n${selectedDate}${fields.get('guests') ? ` · ${fields.get('guests')} invités` : ''}\n\n${fields.get('message')}\n\nDémonstration uniquement : aucune demande n’a été envoyée. Vos informations ne sont ni enregistrées ni transmises.`;
  result.hidden = false;
  result.focus({preventScroll: true});
  result.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'center'});
});
const preview = document.querySelector('#preview-dialog');
document.querySelector('#about-preview').addEventListener('click', () => preview.showModal());
document.querySelector('#preview-close').addEventListener('click', () => preview.close());
document.querySelector('#preview-dismiss').addEventListener('click', () => preview.close());
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog && (event.clientX < dialog.getBoundingClientRect().left || event.clientX > dialog.getBoundingClientRect().right || event.clientY < dialog.getBoundingClientRect().top || event.clientY > dialog.getBoundingClientRect().bottom)) dialog.close(); }));
