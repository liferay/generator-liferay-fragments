import {
  ICollection,
  IFragment,
  IProject,
  IServerCollection,
  IServerFragment,
} from '../../types';
import api from '../utils/api';
import {
  FRAGMENT_IMPORT_STATUS,
  INVALID_FILE_ENTRY_ID,
} from '../utils/constants';

const FRAGMENT_TYPES = { component: 1, react: 2, section: 0 };
const DEFAULT_FRAGMENT_TYPE = FRAGMENT_TYPES.section;

interface ImportResult {
  name: string;
  errorMessage: string;
  status: string;
}

interface ICollectionRequest {
  collection: ICollection;
  existingCollection: IServerCollection | undefined;
  getPromise: () => Promise<void>;
  status: 'error' | 'pending' | 'success';
  error: Error | undefined;
}

type IFragmentRequestStatus =
  | 'pending'
  | 'added'
  | 'updated'
  | 'upToDate'
  | 'ignored'
  | 'error';

interface IFragmentRequest {
  collection: ICollection;
  fragment: IFragment;
  existingFragment: IServerFragment | undefined;
  getPromise: () => Promise<ImportResult>;
  status: IFragmentRequestStatus;
  error: Error | undefined;
}

/**
 * @deprecated
 */
export default async function importLegacy(
  projectContent: IProject,
  groupId: string
): Promise<ImportResult[]> {
  const collectionRequests = projectContent.collections.map((collection) => {
    const collectionRequest: ICollectionRequest = {
      collection,
      existingCollection: undefined,
      error: undefined,
      status: 'pending',
      getPromise: () =>
        _importCollection(groupId, collection)
          .then((existingCollection) => {
            collectionRequest.existingCollection = existingCollection;
            collectionRequest.status = 'success';
          })
          .catch((error) => {
            collectionRequest.error = error;
            collectionRequest.status = 'error';
          }),
    };

    return collectionRequest;
  });

  await _resolveInOrder(
    collectionRequests.map((collectionRequest) => collectionRequest.getPromise)
  );

  const fragmentRequests = collectionRequests
    .map((collectionRequest) =>
      collectionRequest.collection.fragments.map((fragment) => {
        const isCollectionReady =
          collectionRequest.status === 'success' &&
          collectionRequest.existingCollection;

        return {
          collection: collectionRequest.collection,
          fragment,
          existingFragment: undefined,
          getPromise: () =>
            isCollectionReady
              ? _importFragment(
                  groupId,
                  collectionRequest.existingCollection as IServerCollection,
                  fragment
                ).catch((error) => ({
                  status: FRAGMENT_IMPORT_STATUS.INVALID,
                  name: fragment.metadata.name,
                  errorMessage: error.toString(),
                }))
              : Promise.resolve({
                  status: FRAGMENT_IMPORT_STATUS.INVALID,
                  name: fragment.metadata.name,
                  errorMessage: '',
                }),
          error: undefined,
          status: isCollectionReady ? 'pending' : 'ignored',
        } as IFragmentRequest;
      })
    )
    .reduce((a, b) => [...a, ...b], []);

  return _resolveInOrder(
    fragmentRequests.map((fragmentRequest) => fragmentRequest.getPromise)
  );
}

async function _resolveInOrder<T>(fns: Array<() => Promise<T>>): Promise<T[]> {
  if (!fns.length) {
    return [];
  }

  const [nextFn, ...rest] = fns;

  try {
    return [await nextFn(), ...(await _resolveInOrder(rest))];
  } catch (error) {
    return [];
  }
}

async function _importCollection(
  groupId: string,
  collection: ICollection
): Promise<IServerCollection | undefined> {
  const { description, name } = collection.metadata;
  const { slug } = collection;

  let existingCollection = await _getExistingCollection(groupId, collection);

  if (existingCollection) {
    const { fragmentCollectionId } = existingCollection;
    await api.updateFragmentCollection(fragmentCollectionId, name, description);
  } else {
    await api.addFragmentCollection(groupId, slug, name, description);
    existingCollection = await _getExistingCollection(groupId, collection);
  }

  return existingCollection;
}

async function _importFragment(
  groupId: string,
  existingCollection: IServerCollection,
  fragment: IFragment
): Promise<ImportResult> {
  const { fragmentCollectionId } = existingCollection;
  const { configuration, css, html, js } = fragment;
  const { name } = fragment.metadata;
  const type = _getFragmentTypeId(fragment.metadata.type);
  const fragmentEntryKey = fragment.slug;
  const status = 0;
  let previewFileEntryId = INVALID_FILE_ENTRY_ID;
  let errorMessage;

  let existingFragment = await _getExistingFragment(
    groupId,
    existingCollection,
    fragment
  );

  if (fragment.thumbnail?.length) {
    try {
      previewFileEntryId = await api.uploadThumbnail(
        fragment.thumbnail,
        groupId,
        fragmentEntryKey,
        existingFragment ? existingFragment.previewFileEntryId : '0'
      );
    } catch (error) {
      errorMessage = error.toString();
    }
  }

  if (existingFragment && _fragmentHasChanges(existingFragment, fragment)) {
    await api.updateFragmentEntry(existingFragment.fragmentEntryId, {
      status,
      name,
      html,
      css,
      js,
      configuration,
      previewFileEntryId,
    });

    return {
      errorMessage,
      name: fragment.metadata.name,
      status: FRAGMENT_IMPORT_STATUS.IMPORTED,
    };
  }

  if (existingFragment) {
    return {
      errorMessage,
      name: fragment.metadata.name,
      status: FRAGMENT_IMPORT_STATUS.IMPORTED,
    };
  }

  existingFragment = (await api.addFragmentEntry(
    groupId,
    fragmentCollectionId,
    fragmentEntryKey,
    {
      status,
      name,
      type,
      html,
      css,
      js,
      configuration,
      previewFileEntryId,
    }
  )) as IServerFragment | undefined;

  return {
    errorMessage,
    name: fragment.metadata.name,
    status: FRAGMENT_IMPORT_STATUS.IMPORTED,
  };
}

function _fragmentHasChanges(
  existingFragment: IServerFragment,
  fragment: IFragment
) {
  return (
    fragment.css !== existingFragment.css ||
    fragment.html !== existingFragment.html ||
    fragment.js !== existingFragment.js ||
    fragment.configuration !== existingFragment.configuration ||
    fragment.metadata.name !== existingFragment.name
  );
}

function _getFragmentTypeId(type: keyof typeof FRAGMENT_TYPES) {
  let typeId: typeof FRAGMENT_TYPES[keyof typeof FRAGMENT_TYPES] =
    DEFAULT_FRAGMENT_TYPE;

  if (type in FRAGMENT_TYPES) {
    typeId = FRAGMENT_TYPES[type];
  }

  return typeId;
}

async function _getExistingCollection(
  groupId: string,
  collection: ICollection
): Promise<IServerCollection | undefined> {
  const existingCollections = await api.getFragmentCollections(
    groupId,
    collection.metadata.name
  );

  return existingCollections.find(
    (existingCollection) => existingCollection.name === collection.metadata.name
  );
}

async function _getExistingFragment(
  groupId: string,
  existingCollection: IServerCollection,
  fragment: IFragment
): Promise<IServerFragment | undefined> {
  const existingFragments = await api.getFragmentEntries(
    groupId,
    existingCollection.fragmentCollectionId,
    fragment.metadata.name
  );

  return existingFragments.find(
    (existingFragment) => existingFragment.name === fragment.metadata.name
  );
}
