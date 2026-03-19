import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Board } from './components/board/Board';
import { TaskDetail } from './components/task/TaskDetail';
import { CreateTaskDialog } from './components/task/CreateTaskDialog';

function App() {
  const { loadData, isTaskDetailOpen, isCreatingTask, isSidebarOpen } = useAppStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {isSidebarOpen && <Sidebar />}
        <Board />
      </div>
      {isTaskDetailOpen && <TaskDetail />}
      {isCreatingTask && <CreateTaskDialog />}
    </>
  );
}

export default App;
