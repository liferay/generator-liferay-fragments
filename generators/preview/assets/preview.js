// @ts-nocheck
/* global SOCKET_SERVER_PORT */

/** @type {HTMLSelectElement} */
const collectionSelect = document.getElementById('collection');

/** @type {HTMLSelectElement} */
const fragmentSelect = document.getElementById('fragment');

/** @type {HTMLSelectElement} */
const pageTemplateSelect = document.getElementById('pageTemplate');

/** @type {HTMLSelectElement} */
const previewTypeSelect = document.getElementById('previewType');

/** @type {HTMLElement} */
const fragmentsPreview = document.getElementById('fragmentsPreview');

/** @type {HTMLElement} */
const pageTemplatesPreview = document.getElementById('pageTemplatesPreview');

/** @type {HTMLIFrameElement} */
const preview = document.getElementById('preview');

const socket = new WebSocket(`ws://${location.hostname}:${SOCKET_SERVER_PORT}`);

let projectContent = {};

/**
 * @param {HTMLSelectElement} selectElement Select element
 */
function syncSelectFieldURL(selectElement) {
  const url = new URL(location.href);
  url.searchParams.set(selectElement.id, selectElement.value);
  history.pushState(null, null, url.href);
}

collectionSelect.addEventListener('change', () => {
  const collectionId = collectionSelect.value;

  if (collectionId) {
    syncSelectFieldURL(collectionSelect);

    const collection = projectContent.collections.find(
      collection => collection.slug === collectionId
    );

    renderSelect(
      fragmentSelect,
      collection.fragments
        .map(fragment => ({
          value: fragment.slug,
          label: fragment.metadata.name,
          type: 'fragment'
        }))
        .concat(
          collection.fragmentCompositions.map(composition => ({
            value: composition.slug,
            label: composition.metadata.name,
            type: 'composition'
          }))
        )
    );
  }
});

fragmentSelect.addEventListener('change', () => {
  if (fragmentSelect.value) {
    syncSelectFieldURL(fragmentSelect);

    const type = fragmentSelect.selectedOptions[0].dataset.type;

    preview.src = `/fragment-preview?collection=${collectionSelect.value}&fragment=${fragmentSelect.value}&type=${type}`;
  }
});

pageTemplateSelect.addEventListener('change', () => {
  if (pageTemplateSelect.value) {
    syncSelectFieldURL(pageTemplateSelect);

    const type = 'page-template';

    preview.src = `/fragment-preview?pageTemplate=${pageTemplateSelect.value}&type=${type}`;
  }
});

previewTypeSelect.addEventListener('change', () => {
  const changeEvent = new Event('change');
  const url = new URL(location.href);

  url.searchParams.forEach((_, key) => {
    url.searchParams.delete(key);
  });

  url.searchParams.set(previewTypeSelect.id, previewTypeSelect.value);

  history.pushState(null, null, url.href);

  if (previewTypeSelect.value === 'page-template') {
    fragmentsPreview.className = 'hide';
    pageTemplatesPreview.className = '';

    renderSelect(
      pageTemplateSelect,
      projectContent.pageTemplates.map(pageTemplate => ({
        value: pageTemplate.slug,
        label: pageTemplate.metadata.name
      }))
    );

    pageTemplateSelect.dispatchEvent(changeEvent);
  } else {
    fragmentsPreview.className = '';
    pageTemplatesPreview.className = 'hide';

    renderSelect(fragmentSelect, []);

    renderSelect(
      collectionSelect,
      projectContent.collections.map(collection => ({
        value: collection.slug,
        label: collection.metadata.name
      }))
    );

    collectionSelect.dispatchEvent(changeEvent);
  }
});

function renderSelect(selectElement, options) {
  const selectedOption = new URL(location.href).searchParams.get(
    selectElement.id
  );

  selectElement.innerHTML = '';

  options.forEach(option => {
    const optionElement = document.createElement('option');

    optionElement.value = option.value;
    optionElement.innerHTML = option.label;
    optionElement.setAttribute('data-type', option.type);

    selectElement.appendChild(optionElement);
  });

  if (options.length) {
    selectElement.removeAttribute('disabled');
  } else {
    selectElement.setAttribute('disabled', 'disabled');
  }

  if (selectedOption) {
    selectElement.value = selectedOption;
  } else if (options.length === 1) {
    selectElement.value = options[0].value;
  }

  const changeEvent = new Event('change');
  selectElement.dispatchEvent(changeEvent);
}

socket.addEventListener('message', event => {
  projectContent = JSON.parse(event.data);

  preview.src = '/fragment-preview';

  renderSelect(previewTypeSelect, [
    { value: 'fragment', label: 'Fragments' },
    { value: 'page-template', label: 'Page Templates' }
  ]);

  if (previewTypeSelect.value === 'fragment') {
    renderSelect(fragmentSelect, []);

    renderSelect(
      collectionSelect,
      projectContent.collections.map(collection => ({
        value: collection.slug,
        label: collection.metadata.name
      }))
    );
  } else {
    renderSelect(
      pageTemplateSelect,
      projectContent.pageTemplates.map(pageTemplate => ({
        value: pageTemplate.slug,
        label: pageTemplate.metadata.name
      }))
    );
  }
});
