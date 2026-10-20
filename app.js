'use strict';
const content = window.CAAB_CONTENT;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const assetPath = (id, small = false) => `assets/reception-${String(id).padStart(2, '0')}${small ? '-small' : ''}.webp`;
const views = {
  lieu: {id:7, caption:'Les tables, les volumes, les couleurs : un même fil conducteur dans toute la salle.', position:'50% 58%'},
  table: {id:5, caption:'Le bleu du linge, le blanc des assiettes, la transparence du verre. Chaque place prolonge le décor.', position:'50% 68%'},
  lumiere: {id:14, caption:'La même réception à la nuit tombée. Les lumières ponctuent les tables et le décor change de présence.', position:'50% 62%'}
};
const sceneImage = document.querySelector('#scene-image');
const sceneOpen = document.querySelector('#scene-open');
let sceneId = 7;
let sceneRequest = 0;
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  const view = views[button.dataset.view];
  sceneId = view.id;
  const photo = content.photos.find(photo => photo.id === sceneId);
  document.querySelectorAll('[data-view]').forEach(item => item.setAttribute('aria-pressed',String(item === button)));
  sceneImage.src = assetPath(view.id);
  sceneImage.alt = photo.alt;
  sceneImage.style.objectPosition = view.position;
  sceneOpen.setAttribute('aria-label',`Agrandir : ${photo.caption}`);
  document.querySelector('#scene-caption').textContent = view.caption;
  const request = ++sceneRequest;
  sceneImage.decode().then(() => {
    if (request === sceneRequest && !reducedMotion.matches) sceneImage.animate([{opacity:.5},{opacity:1}],{duration:320,easing:'ease-out'});
  }).catch(() => {});
}));

const albumGrid = document.querySelector('#album-grid');
content.photos.forEach((photo,index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label',`Agrandir la photo ${index + 1} : ${photo.caption}`);
  const img = document.createElement('img');
  img.src = assetPath(photo.id,true); img.alt = photo.alt; img.loading = 'lazy';
  img.width = 600; img.height = photo.id === 9 ? 400 : 900;
  const caption = document.createElement('span');
  caption.textContent = `${String(index + 1).padStart(2,'0')} / 14`;
  button.append(img,caption); button.addEventListener('click',() => showPhoto(photo.id));
  albumGrid.append(button);
});

const lightbox = document.querySelector('#lightbox');
const photoImage = document.querySelector('#lightbox-image');
let photoIndex = 0;
function updatePhoto() {
  const photo = content.photos[photoIndex];
  photoImage.src = assetPath(photo.id); photoImage.alt = photo.alt;
  document.querySelector('#lightbox-counter').textContent = `${photoIndex + 1} / ${content.photos.length} · Une seule réception CAAB`;
  document.querySelector('#lightbox-caption').textContent = photo.caption;
}
function showPhoto(id) {
  photoIndex = content.photos.findIndex(photo => photo.id === id);
  if (photoIndex < 0) return;
  updatePhoto();
  if (!lightbox.open) lightbox.showModal();
}
function movePhoto(delta) {photoIndex = (photoIndex + delta + content.photos.length) % content.photos.length; updatePhoto();}
sceneOpen.addEventListener('click',() => showPhoto(sceneId));
document.querySelector('#lightbox-close').addEventListener('click',() => lightbox.close());
document.querySelector('#photo-prev').addEventListener('click',() => movePhoto(-1));
document.querySelector('#photo-next').addEventListener('click',() => movePhoto(1));
lightbox.addEventListener('keydown',event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {event.preventDefault(); movePhoto(event.key === 'ArrowLeft' ? -1 : 1);}
});
let touchStart = null;
photoImage.addEventListener('touchstart',event => {touchStart = event.touches.length === 1 ? {x:event.touches[0].clientX,y:event.touches[0].clientY} : null;},{passive:true});
photoImage.addEventListener('touchend',event => {
  if (!touchStart) return;
  const dx = event.changedTouches[0].clientX - touchStart.x;
  const dy = event.changedTouches[0].clientY - touchStart.y;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)*1.5) movePhoto(dx > 0 ? -1 : 1);
  touchStart = null;
},{passive:true});
photoImage.addEventListener('touchcancel',() => {touchStart = null;},{passive:true});
lightbox.addEventListener('close',() => {touchStart = null;});

const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
function closeMenu() {toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Ouvrir le menu');nav.classList.remove('is-open');}
toggle.addEventListener('click',() => {
  const opening = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded',String(opening));toggle.setAttribute('aria-label',opening ? 'Fermer le menu' : 'Ouvrir le menu');nav.classList.toggle('is-open',opening);
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click',closeMenu));
document.addEventListener('keydown',event => {if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {closeMenu();toggle.focus();}});
document.addEventListener('click',event => {if (!event.target.closest('.site-header')) closeMenu();});
window.matchMedia('(min-width: 801px)').addEventListener('change',event => {if (event.matches) closeMenu();});

const form = document.querySelector('#quote-form');
const result = document.querySelector('#form-result');
const date = document.querySelector('#event-date');
const now = new Date();
date.min = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
const fields = [...form.querySelectorAll('input,select,textarea')];
const messages = {event:'Choisissez une occasion.',place:'Précisez la commune ou le lieu.',message:'Racontez-nous vos envies en quelques mots.',name:'Indiquez votre nom.',email:'Indiquez une adresse e-mail, par exemple vous@exemple.fr.'};
function validate(field) {
  const valid = field.checkValidity() && (!field.required || field.value.trim().length > 0);
  const error = document.getElementById(`${field.id}-error`);
  field.setAttribute('aria-invalid',String(!valid));
  error.textContent = valid ? '' : messages[field.name] || (field.name === 'date' ? 'Choisissez une date à venir, ou laissez ce champ vide.' : 'Indiquez un nombre entre 1 et 10 000, ou laissez ce champ vide.');
  error.hidden = valid;
  return valid;
}
fields.forEach(field => {
  field.addEventListener('input',() => {
    result.hidden = true;
    if (field.getAttribute('aria-invalid') === 'true') validate(field);
  });
  field.addEventListener('change',() => {result.hidden = true;if (field.getAttribute('aria-invalid') === 'true') validate(field);});
});
let projectText = '';
form.addEventListener('submit',event => {
  event.preventDefault();
  const invalid = fields.filter(field => !validate(field));
  const error = document.querySelector('#form-error');
  error.hidden = !invalid.length;
  if (invalid.length) {
    result.hidden = true;
    error.textContent = `${invalid.length === 1 ? 'Un champ est à compléter ou à corriger' : `${invalid.length} champs sont à compléter ou à corriger`}. Vos autres réponses sont conservées.`;
    invalid[0].focus();return;
  }
  const values = new FormData(form);
  const selectedDate = values.get('date') ? new Intl.DateTimeFormat('fr-FR',{dateStyle:'long'}).format(new Date(`${values.get('date')}T12:00:00`)) : 'Date à préciser';
  const rows = [['L’occasion',values.get('event')],['Le lieu',values.get('place').trim()],['La date',selectedDate],['Les invités',values.get('guests') || 'À préciser'],['Vos envies',values.get('message').trim()],['Votre nom',values.get('name').trim()],['Votre e-mail',values.get('email').trim()]];
  const details = document.querySelector('#result-details');details.replaceChildren();
  rows.forEach(([label,value]) => {const dt=document.createElement('dt');const dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;details.append(dt,dd);});
  projectText = `CAAB ÉVÉNEMENTS — Récapitulatif de démonstration\nAucune demande envoyée.\n\n${rows.map(([label,value]) => `${label} : ${value}`).join('\n\n')}`;
  document.querySelector('#copy-status').textContent = '';
  result.hidden = false;result.focus({preventScroll:true});
  result.scrollIntoView({behavior:reducedMotion.matches ? 'instant' : 'smooth',block:'start'});
});
document.querySelector('#edit-project').addEventListener('click',() => {result.hidden=true;form.elements.event.focus();});
document.querySelector('#copy-project').addEventListener('click',async () => {
  const status = document.querySelector('#copy-status');
  try {await navigator.clipboard.writeText(projectText);status.textContent='Récapitulatif copié. Vous pouvez le conserver de votre côté.';}
  catch {status.textContent='La copie automatique est indisponible. Sélectionnez le récapitulatif ci-dessus pour le copier.';}
});
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click',event => {
  const rect=dialog.getBoundingClientRect();
  if (event.target===dialog && (event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom)) dialog.close();
}));
