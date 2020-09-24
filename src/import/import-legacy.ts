import path from 'path';

import {
  ICollection,
  ICollectionRequest,
  IFragment,
  IFragmentRequest,
  IFragmentRequestStatus,
  IServerCollection,
  IServerFragment,
} from '../../types';
import api from '../utils/api';
import { log } from '../utils/log';
import getProjectContent from '../utils/project-content/get-project-content';

const FRAGMENT_TYPES = { component: 1, section: 0 };
const DEFAULT_FRAGMENT_TYPE = FRAGMENT_TYPES.section;

/**
 * @deprecated
 */
export default async function importLegacy(
  groupId: string,
  projectPath: string
): Promise<void> {
  const project = getProjectContent(projectPath);

  const collectionRequests = project.collections.map((collection) => {
    const collectionRequest: ICollectionRequest = {
      collection,
      existingCollection: undefined,
      error: undefined,
      status: 'pending',
      promise: undefined,
    };

    collectionRequest.promise = _importCollection(groupId, collection)
      .then((existingCollection) => {
        collectionRequest.existingCollection = existingCollection;
        collectionRequest.status = 'success';
      })
      .catch((error) => {
        collectionRequest.error = error;
        collectionRequest.status = 'error';
      });

    return collectionRequest;
  });

  await Promise.all(
    collectionRequests.map((collectionRequest) => collectionRequest.promise)
  );

  const fragmentRequests = collectionRequests
    .map((collectionRequest) =>
      collectionRequest.collection.fragments.map((fragment) => {
        const fragmentRequest: IFragmentRequest = {
          collection: collectionRequest.collection,
          fragment,
          existingFragment: undefined,
          promise: undefined,
          error: undefined,
          status: 'pending',
        };

        if (
          collectionRequest.status === 'success' &&
          collectionRequest.existingCollection
        ) {
          fragmentRequest.promise = _importFragment(
            groupId,
            collectionRequest.existingCollection,
            fragment,
            projectPath
          )
            .then(([status, existingFragment]) => {
              fragmentRequest.status = status as IFragmentRequestStatus;
              fragmentRequest.existingFragment = existingFragment as IServerFragment;
            })
            .catch((error) => {
              fragmentRequest.status = 'error';
              fragmentRequest.error = error;
            });
        } else {
          fragmentRequest.promise = Promise.resolve();
          fragmentRequest.status = 'ignored';
        }

        return fragmentRequest;
      })
    )
    .reduce((a, b) => [...a, ...b], []);

  await Promise.all(
    fragmentRequests.map((fragmentRequest) => fragmentRequest.promise)
  );

  _logImportSummary(collectionRequests, fragmentRequests);
  _logImportErrorsLegacy(collectionRequests, fragmentRequests);
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
  fragment: IFragment,
  projectPath: string
): Promise<[IFragmentRequestStatus, IServerFragment | undefined]> {
  const { fragmentCollectionId } = existingCollection;
  const { configuration, css, html, js } = fragment;
  const { name } = fragment.metadata;
  const type = _getFragmentTypeId(fragment.metadata.type);
  const fragmentEntryKey = fragment.slug;
  const status = 0;
  let previewFileEntryId = 0;

  let existingFragment = await _getExistingFragment(
    groupId,
    existingCollection,
    fragment
  );

  if (fragment.metadata.thumbnailPath) {
    previewFileEntryId = await api.uploadThumbnail(
      groupId,
      fragmentEntryKey,
      path.join(
        projectPath,
        'src',
        existingCollection.fragmentCollectionKey,
        fragment.slug,
        fragment.metadata.thumbnailPath
      ),
      existingFragment ? existingFragment.previewFileEntryId : '0'
    );
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

    return ['updated', existingFragment];
  }

  if (existingFragment) {
    return ['upToDate', existingFragment];
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

  return ['added', existingFragment];
}

function _logImportErrorsLegacy(
  collectionRequests: ICollectionRequest[],
  fragmentRequests: IFragmentRequest[]
) {
  const sortedFragmentRequests = [...fragmentRequests].sort((a, b) => {
    if (a.collection.slug < b.collection.slug) {
      return -1;
    }

    if (a.collection.slug > b.collection.slug) {
      return 1;
    }

    if (a.fragment.slug < b.fragment.slug) {
      return -1;
    }

    if (a.fragment.slug > b.fragment.slug) {
      return 1;
    }

    return 0;
  });

  collectionRequests.forEach((collectionRequest) => {
    const name =
      collectionRequest.collection.metadata.name ||
      collectionRequest.collection.slug;

    log('');
    if (collectionRequest.status === 'success') {
      log(`✔ Collection ${name}`, { level: 'success' });
    } else {
      log(`✘ Collection ${name} was not imported`, { level: 'error' });

      if (collectionRequest.error) {
        log(collectionRequest.error.message);
      }
    }

    sortedFragmentRequests
      .filter(
        (fragmentRequest) =>
          fragmentRequest.collection.slug === collectionRequest.collection.slug
      )
      .forEach((fragmentRequest) => {
        if (fragmentRequest.status === 'error') {
          log(
            `✘ Fragment ${
              fragmentRequest.fragment.metadata.name ||
              fragmentRequest.fragment.slug
            } was not imported due to fragment errors`,
            { level: 'error', indent: true }
          );

          if (fragmentRequest.error) {
            log(fragmentRequest.error.message, { indent: true });
          }
        } else if (fragmentRequest.status === 'ignored') {
          log(
            `↷ Fragment ${fragmentRequest.fragment.metadata.name} was not imported due to collection errors`,
            {
              level: 'error',
              indent: true,
            }
          );
        } else if (fragmentRequest.status === 'added') {
          log(`✚ Fragment ${fragmentRequest.fragment.metadata.name} added`, {
            level: 'success',
            indent: true,
          });
        } else if (fragmentRequest.status === 'updated') {
          log(`✎ Fragment ${fragmentRequest.fragment.metadata.name} updated`, {
            level: 'success',
            indent: true,
          });
        } else {
          log(
            `✔ Fragment ${fragmentRequest.fragment.metadata.name} up-to-date`,
            {
              level: 'success',
              indent: true,
            }
          );
        }
      });
  });
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
  let typeId: typeof FRAGMENT_TYPES[keyof typeof FRAGMENT_TYPES] = DEFAULT_FRAGMENT_TYPE;

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

function _logImportSummary(
  collectionRequests: ICollectionRequest[],
  fragmentRequests: IFragmentRequest[]
) {
  const addedCount = fragmentRequests.filter(
    (fragmentRequest) => fragmentRequest.status === 'added'
  ).length;

  const updatedCount = fragmentRequests.filter(
    (fragmentRequest) => fragmentRequest.status === 'updated'
  ).length;

  const upToDateCount = fragmentRequests.filter(
    (fragmentRequest) => fragmentRequest.status === 'upToDate'
  ).length;

  const ignoredCount = fragmentRequests.filter(
    (fragmentRequest) => fragmentRequest.status === 'ignored'
  ).length;

  const errorCount = fragmentRequests.filter(
    (fragmentRequest) => fragmentRequest.status === 'error'
  ).length;

  const statusLog = (
    count: number,
    message: string,
    level: 'success' | 'error' = 'success'
  ) => {
    const noun = fragmentRequests.length === 1 ? 'fragment' : 'fragments';
    const verb = count === 1 ? 'was' : 'were';

    if (count > 0) {
      log(
        `${count} of ${fragmentRequests.length} ${noun} ${verb} ${message}.`,
        { level }
      );
    }
  };

  log('');
  statusLog(addedCount, 'added successfully');
  statusLog(updatedCount, 'updated successfully');
  statusLog(upToDateCount, 'already up to date');
  statusLog(ignoredCount + errorCount, 'not imported due to errors', 'error');
}
