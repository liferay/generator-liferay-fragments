// @ts-nocheck
/* global SOCKET_SERVER_PORT */

/** @type {HTMLSelectElement} */
const collectionSelect = document.getElementById('collection');

/** @type {HTMLSelectElement} */
const fragmentSelect = document.getElementById('fragment');

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
      collection.fragments.map(fragment => ({
        value: fragment.slug,
        label: fragment.metadata.name
      }))
    );
  }
});

fragmentSelect.addEventListener('change', () => {
  if (fragmentSelect.value) {
    syncSelectFieldURL(fragmentSelect);
    preview.src = `/fragment-preview?collection=${collectionSelect.value}&fragment=${fragmentSelect.value}`;
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

  renderSelect(fragmentSelect, []);

  renderSelect(
    collectionSelect,
    projectContent.collections.map(collection => ({
      value: collection.slug,
      label: collection.metadata.name
    }))
  );
});
