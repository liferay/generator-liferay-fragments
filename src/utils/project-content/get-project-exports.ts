import path from 'path';

import { IProject } from '../../../types';

interface Export {
  slug: string;
  path: string;
}

export const getProjectExports = (projectContent: IProject): Export[] =>
  projectContent.collections
    .map((collection) =>
      collection.fragments
        .filter((fragment) => fragment.metadata.type === 'react')
        .map((fragment) => ({
          slug: fragment.slug,
          path: `.${path.sep}${path.join(
            collection.slug,
            fragment.slug,
            fragment.metadata.jsPath
          )}`,
        }))
    )
    .reduce((fragmentsA, fragmentsB) => {
      return fragmentsA.concat(fragmentsB);
    }, []);
