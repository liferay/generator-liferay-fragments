// @ts-nocheck
/* global SOCKET_SERVER_PORT */

const form = document.getElementById('form');
const preview = document.getElementById('preview');
const socket = new WebSocket(`ws://${location.hostname}:${SOCKET_SERVER_PORT}`);

let currentCollection = '';
let projectContent = {};
let initialized = false;

function isDisabled(element) {
  return element
    ? element.disabled || isDisabled(element.parentElement)
    : false;
}

function updateOptions(list, select) {
  const previousValue = select.value;
  select.innerHTML = '';

  for (const item of list) {
    const option = document.createElement('option');
    option.value = item.slug;
    option.innerHTML = item.metadata.name;
    select.appendChild(option);
  }

  if (list.some((item) => item.slug === previousValue)) {
    select.value = previousValue;
  }
}

function updateCurrentCollection() {
  currentCollection = form.elements.collection.value;

  const collection = projectContent.collections.find(
    (collection) => collection.slug === currentCollection
  );

  if (!collection) {
    return;
  }

  updateOptions(
    [...collection.fragments, ...collection.fragmentCompositions],
    form.elements.fragment
  );
}

function handleFormChange() {
  const fieldsetId = form.elements.fieldsetId.value;

  for (const fieldset of form.querySelectorAll('fieldset')) {
    if (fieldset.id === fieldsetId) {
      fieldset.disabled = false;
    } else {
      fieldset.disabled = true;
    }
  }

  if (form.elements.collection.value !== currentCollection) {
    updateCurrentCollection();
  }

  const url = new URL(location.href);

  for (const element of form.elements) {
    if (element.name) {
      if (element.value && !isDisabled(element)) {
        if (url.searchParams.get(element.name) !== element.value) {
          url.searchParams.set(element.name, element.value);
          history.pushState(null, null, url.href);
        }
      } else if (url.searchParams.has(element.name)) {
        url.searchParams.delete(element.name);
        history.pushState(null, null, url.href);
      }
    }
  }

  if (
    fieldsetId === 'fragmentsPreview' &&
    form.elements.collection.value &&
    form.elements.fragment.value
  ) {
    const collectionSlug = form.elements.collection.value;
    const fragmentSlug = form.elements.fragment.value;

    preview.src = `/fragment-preview?collection=${collectionSlug}&fragment=${fragmentSlug}`;
  } else if (
    fieldsetId === 'pageTemplatesPreview' &&
    form.elements.pageTemplate.value
  ) {
    const pageTemplateSlug = form.elements.pageTemplate.value;
    preview.src = `/fragment-preview?pageTemplate=${pageTemplateSlug}`;
  } else {
    preview.src = '/fragment-preview';
  }
}

function handleMessage(event) {
  projectContent = JSON.parse(event.data);

  updateOptions(projectContent.collections, form.elements.collection);
  updateOptions(projectContent.pageTemplates, form.elements.pageTemplate);

  if (!initialized) {
    initialized = true;
    preview.src = '/fragment-preview';

    const url = new URL(window.location.href);

    form.elements.fieldsetId.value =
      url.searchParams.get('fieldsetId') || form.elements.fieldsetId.value;

    form.elements.pageTemplate.value =
      url.searchParams.get('pageTemplate') || form.elements.pageTemplate.value;

    form.elements.collection.value =
      url.searchParams.get('collection') || form.elements.collection.value;

    updateCurrentCollection();

    form.elements.fragment.value =
      url.searchParams.get('fragment') || form.elements.fragment.value;

    handleFormChange();
  } else if (preview.src) {
    // eslint-disable-next-line no-self-assign
    preview.src = preview.src;
  }
}

socket.addEventListener('message', handleMessage);
form.addEventListener('change', handleFormChange);
