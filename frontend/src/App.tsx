import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { Header } from './components/layout/Header';
import { Board } from './components/board/Board';
import { TaskDetail } from './components/task/TaskDetail';
import { CreateTaskDialog } from './components/task/CreateTaskDialog';

function App() {
  const { loadData, isTaskDetailOpen, isCreatingTask } = useAppStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      <Header />
      <Board />
      {isTaskDetailOpen && <TaskDetail />}
      {isCreatingTask && <CreateTaskDialog />}
    </>
  );
}

export default App;
