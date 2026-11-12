const $ = (selector) => document.querySelector(selector);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
$('#year').textContent = new Date().getFullYear();

const header = $('#header');
const menu = $('#menu-toggle');
const navigation = $('#navigation');
function closeMenu() {
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Open navigation');
  navigation.classList.remove('is-open');
}
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  navigation.classList.toggle('is-open', open);
});
navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });
document.addEventListener('click', (event) => { if (!header.contains(event.target)) closeMenu(); });
window.addEventListener('resize', () => { if (window.innerWidth > 760) closeMenu(); });

if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => header.classList.toggle('is-stuck', !entry.isIntersecting), {rootMargin: '-90px 0px 0px 0px'}).observe($('#home'));
  const mobileEnquire = $('.mobile-enquire');
  let heroVisible = true;
  let bookingVisible = false;
  let footerVisible = false;
  const updateEnquire = () => mobileEnquire.classList.toggle('visible', !heroVisible && !bookingVisible && !footerVisible);
  new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; updateEnquire(); }).observe($('#home'));
  new IntersectionObserver(([entry]) => { bookingVisible = entry.isIntersecting; updateEnquire(); }).observe($('#booking'));
  new IntersectionObserver(([entry]) => { footerVisible = entry.isIntersecting; updateEnquire(); }).observe($('footer'));
  const activeSections = new Map();
  const activeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => activeSections.set(entry.target.id, entry.isIntersecting));
    const active = [...activeSections].find(([, visible]) => visible)?.[0];
    navigation.querySelectorAll('a').forEach((link) => {
      const selected = link.hash === `#${active}`;
      link.classList.toggle('active', selected);
      if (selected) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
  }, {rootMargin: '-15% 0px -55% 0px'});
  ['cottage', 'stay', 'gallery', 'location'].forEach((id) => activeObserver.observe(document.getElementById(id)));
  if (!reducedMotion) {
    document.documentElement.classList.add('motion-ready');
    const revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
    }), {threshold: 0.08});
    document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
  }
}

// Only the selected, edited assets are exposed to visitors.
const images = [
  {id: 'room', src: 'media/room.webp', title: 'The Cottage Room', alt: 'Room styling concept with the actual turquoise walls and grey marble floor', caption: 'AI-assisted room styling concept based on the actual room. Proposed furnishings; confirm the current setup with our team.'},
  {id: 'terrace', src: 'media/terrace.webp', title: 'A seat with a slower view.', alt: 'Edited terrace styling concept against the real Kullu mountain skyline', caption: 'AI-assisted terrace styling concept. Seating, pergola and planting are proposed additions to the existing rooftop.'},
  {id: 'valley', src: 'media/valley.webp', title: 'The valley, in perspective.', alt: 'Professionally edited valley photograph from the property', caption: 'Edited from the property’s valley photograph. Framing, foreground and lighting have been refined.'},
  {id: 'garden', src: 'media/garden.webp', title: 'Outside, unhurried.', alt: 'Edited garden styling concept preserving the actual trees and mountain outlook', caption: 'AI-assisted garden styling concept. Landscaping and seating are proposed additions to the existing grounds.'}
];
const lightbox = $('#lightbox');
let imageIndex = 0;
let lastImageTrigger = null;
function renderImage(index) {
  imageIndex = (index + images.length) % images.length;
  const item = images[imageIndex];
  $('#lightbox-img').src = item.src;
  $('#lightbox-img').alt = item.alt;
  $('#lightbox-title').textContent = item.title;
  $('#lightbox-caption').textContent = item.caption;
  $('#lightbox-counter').textContent = `${String(imageIndex + 1).padStart(2, '0')} / ${String(images.length).padStart(2, '0')}`;
}
document.querySelectorAll('.image-open').forEach((button) => button.addEventListener('click', () => {
  lastImageTrigger = button;
  renderImage(images.findIndex((item) => item.id === button.dataset.image));
  lightbox.showModal();
  document.body.classList.add('modal-open');
}));
$('#close-lightbox').addEventListener('click', () => lightbox.close());
$('#previous-image').addEventListener('click', () => renderImage(imageIndex - 1));
$('#next-image').addEventListener('click', () => renderImage(imageIndex + 1));
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) {
    const bounds = lightbox.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) lightbox.close();
  }
});
lightbox.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') { event.preventDefault(); renderImage(imageIndex - 1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); renderImage(imageIndex + 1); }
});
lightbox.addEventListener('close', () => { document.body.classList.remove('modal-open'); lastImageTrigger?.focus({preventScroll: true}); });

const form = $('#booking-form');
const fields = form.elements;
const status = $('#form-status');
const localDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const tomorrow = (dateString) => { const date = new Date(`${dateString}T12:00:00`); date.setDate(date.getDate() + 1); return localDate(date); };
function setDateLimits() {
  const today = localDate(new Date());
  fields.checkin.min = today;
  fields.checkout.min = tomorrow(fields.checkin.value >= today ? fields.checkin.value : today);
}
setDateLimits();
fields.checkin.addEventListener('change', () => {
  setDateLimits();
  if (fields.checkout.value && fields.checkout.value <= fields.checkin.value) fields.checkout.value = '';
  updateSummary();
});
function updateSummary() {
  status.textContent = '';
  const rooms = Number(fields.rooms.value);
  const guests = Number(fields.guests.value);
  const parts = [];
  if (Number.isInteger(rooms) && rooms > 0) parts.push(`${rooms} ${rooms === 1 ? 'room' : 'rooms'}`);
  if (Number.isInteger(guests) && guests > 0) parts.push(`${guests} ${guests === 1 ? 'guest' : 'guests'}`);
  if (fields.checkin.value && fields.checkout.value > fields.checkin.value) {
    const nights = Math.round((Date.parse(fields.checkout.value) - Date.parse(fields.checkin.value)) / 86400000);
    parts.push(`${nights} ${nights === 1 ? 'night' : 'nights'}`);
  }
  $('#stay-summary').textContent = parts.join(' · ');
}
form.addEventListener('input', updateSummary);
form.addEventListener('submit', (event) => {
  event.preventDefault();
  setDateLimits();
  const name = fields.namedItem('name').value.trim();
  if (!name) { status.textContent = 'Please enter your name.'; fields.namedItem('name').focus(); return; }
  if (!form.reportValidity()) return;
  const rooms = Number(fields.rooms.value);
  const guests = Number(fields.guests.value);
  if (fields.checkout.value <= fields.checkin.value) { status.textContent = 'Please choose check-out after check-in.'; fields.checkout.focus(); return; }
  if (guests > rooms * 3) { status.textContent = `For ${guests} guests, please choose at least ${Math.ceil(guests / 3)} rooms. Each room accommodates up to 3 guests.`; fields.rooms.focus(); return; }
  if (guests < rooms) { status.textContent = 'Please allow at least one guest per room.'; fields.guests.focus(); return; }
  const formatDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'});
  const message = ['Hello Thakur Cottage, I’d like to enquire about a stay.', `Name: ${name}`, `Check-in: ${formatDate(fields.checkin.value)}`, `Check-out: ${formatDate(fields.checkout.value)}`, `Rooms: ${rooms}`, `Guests: ${guests}`, fields.message.value.trim() ? `Requests: ${fields.message.value.trim()}` : '', 'Please share current room photos, availability and rates.'].filter(Boolean).join('\n');
  const link = document.createElement('a');
  link.href = `https://wa.me/917220080005?text=${encodeURIComponent(message)}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.click();
  status.textContent = 'Your enquiry is ready in WhatsApp. Press Send there to contact our team.';
});
