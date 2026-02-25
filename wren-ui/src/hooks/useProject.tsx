import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  LIST_PROJECTS,
  CREATE_PROJECT,
  UPDATE_PROJECT,
  DELETE_PROJECT,
} from '@/apollo/client/graphql/project';

const LOCAL_STORAGE_KEY = 'wren-current-project-id';

export interface ProjectInfo {
  id: number;
  type: string;
  displayName: string;
  language: string;
  sampleDataset: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectContextValue {
  /** All projects available */
  projects: ProjectInfo[];
  /** Currently selected project (null if none) */
  currentProject: ProjectInfo | null;
  /** Currently selected project ID (undefined if none) */
  currentProjectId: number | undefined;
  /** Switch to a different project by ID */
  setCurrentProjectId: (id: number) => void;
  /** Whether the project list is still loading */
  loading: boolean;
  /** Refetch the project list */
  refetchProjects: () => Promise<void>;
  /** Create a new project (returns the created project) */
  createProject: (data: {
    displayName: string;
    type: string;
  }) => Promise<ProjectInfo>;
  /** Update a project */
  updateProject: (
    projectId: number,
    data: { displayName?: string; language?: string },
  ) => Promise<ProjectInfo>;
  /** Delete a project */
  deleteProject: (projectId: number) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue>(
  {} as ProjectContextValue,
);

/**
 * Reads the current project ID from localStorage.
 * This is also used by the Apollo Client link to set the X-Project-Id header
 * without depending on React state.
 */
export function getStoredProjectId(): number | undefined {
  if (typeof window === 'undefined') return undefined;
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored) {
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function setStoredProjectId(id: number | undefined) {
  if (typeof window === 'undefined') return;
  if (id !== undefined) {
    localStorage.setItem(LOCAL_STORAGE_KEY, String(id));
  } else {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [currentProjectId, setCurrentProjectIdState] = useState<
    number | undefined
  >(() => getStoredProjectId());

  const { data, loading, refetch } = useQuery(LIST_PROJECTS, {
    fetchPolicy: 'cache-and-network',
  });

  const [createProjectMutation] = useMutation(CREATE_PROJECT);
  const [updateProjectMutation] = useMutation(UPDATE_PROJECT);
  const [deleteProjectMutation] = useMutation(DELETE_PROJECT);

  const projects: ProjectInfo[] = useMemo(
    () => data?.listProjects ?? [],
    [data],
  );

  // Once projects load, ensure we have a valid currentProjectId
  useEffect(() => {
    if (loading || projects.length === 0) return;
    const stored = currentProjectId;
    const valid = projects.some((p) => p.id === stored);
    if (!valid) {
      // Default to the first project
      const firstId = projects[0].id;
      setCurrentProjectIdState(firstId);
      setStoredProjectId(firstId);
    }
  }, [projects, loading, currentProjectId]);

  const currentProject = useMemo(
    () => projects.find((p) => p.id === currentProjectId) ?? null,
    [projects, currentProjectId],
  );

  const setCurrentProjectId = useCallback((id: number) => {
    setCurrentProjectIdState(id);
    setStoredProjectId(id);
  }, []);

  const refetchProjects = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleCreateProject = useCallback(
    async (input: { displayName: string; type: string }) => {
      const { data: result } = await createProjectMutation({
        variables: { data: input },
      });
      await refetch();
      return result.createProject;
    },
    [createProjectMutation, refetch],
  );

  const handleUpdateProject = useCallback(
    async (
      projectId: number,
      input: { displayName?: string; language?: string },
    ) => {
      const { data: result } = await updateProjectMutation({
        variables: { projectId, data: input },
      });
      await refetch();
      return result.updateProject;
    },
    [updateProjectMutation, refetch],
  );

  const handleDeleteProject = useCallback(
    async (projectId: number) => {
      await deleteProjectMutation({ variables: { projectId } });
      // If we deleted the current project, switch to another one
      if (currentProjectId === projectId) {
        const remaining = projects.filter((p) => p.id !== projectId);
        if (remaining.length > 0) {
          setCurrentProjectIdState(remaining[0].id);
          setStoredProjectId(remaining[0].id);
        } else {
          setCurrentProjectIdState(undefined);
          setStoredProjectId(undefined);
        }
      }
      await refetch();
    },
    [deleteProjectMutation, currentProjectId, projects, refetch],
  );

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      currentProject,
      currentProjectId,
      setCurrentProjectId,
      loading,
      refetchProjects,
      createProject: handleCreateProject,
      updateProject: handleUpdateProject,
      deleteProject: handleDeleteProject,
    }),
    [
      projects,
      currentProject,
      currentProjectId,
      setCurrentProjectId,
      loading,
      refetchProjects,
      handleCreateProject,
      handleUpdateProject,
      handleDeleteProject,
    ],
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export default function useProject() {
  return useContext(ProjectContext);
}
