'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

type Task = {
  id: string;
  text: string;
  completed: boolean;
  deadline: string;
};

const MySwal = withReactContent(Swal);

export default function TodoList() {
  const [isClient, setIsClient] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      const querySnapshot = await getDocs(collection(db, 'tasks'));
      const tasksData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];
      setTasks(tasksData);
    };
    fetchTasks();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeRemaining: { [key: string]: string } = {};
      tasks.forEach((task) => {
        if (!task.completed) { // hanya update waktu jika tugas belum selesai
          newTimeRemaining[task.id] = calculateTimeRemaining(task.deadline);
        }
      });
      setTimeRemaining(newTimeRemaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [tasks]);

  const calculateTimeRemaining = (deadline: string): string => {
    const deadlineTime = new Date(deadline).getTime();
    const now = new Date().getTime();
    const difference = deadlineTime - now;

    if (difference <= 0) return 'Waktu habis!';

    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return `${hours}j ${minutes}m ${seconds}d`;
  };

  const showTaskPopup = async (title: string, task?: Task): Promise<[string, string] | null> => {
    const { value: formValues } = await MySwal.fire({
      title: `<span style="font-family: Cinzel; color: #5e3b1d;">${title}</span>`,
      html:
        `<input id="swal-input1" class="swal2-input" placeholder="Nama tugas" style="font-family: 'Georgia', serif; background-color: #fdf5e6; border: 1px solid #a67c52; color: #4b3b2a; padding: 10px; border-radius: 8px;" value="${task?.text || ''}">` +
        `<input id="swal-input2" type="datetime-local" class="swal2-input" style="font-family: 'Georgia', serif; background-color: #fdf5e6; border: 1px solid #a67c52; color: #4b3b2a; padding: 10px; border-radius: 8px;" value="${task?.deadline || ''}">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      customClass: {
        popup: 'rounded-xl border border-[#b59b7c] shadow-lg',
        confirmButton: 'bg-gradient-to-b from-[#a67c52] to-[#744d29] text-white px-4 py-2 rounded shadow-md hover:brightness-110 font-[Cinzel] mr-2',
        cancelButton: 'bg-[#e5d8be] text-[#4b3b2a] px-4 py-2 rounded shadow hover:bg-[#d4c6ad] font-[Cinzel] ml-2',
      },      
      buttonsStyling: false,
      preConfirm: () => {
        const input1 = (document.getElementById('swal-input1') as HTMLInputElement)?.value;
        const input2 = (document.getElementById('swal-input2') as HTMLInputElement)?.value;
        if (!input1 || !input2) {
          Swal.showValidationMessage('Semua field harus diisi!');
        }
        return [input1, input2];
      },
    });
  
    if (formValues && formValues[0] && formValues[1]) {
      return formValues as [string, string];
    }
  
    return null;
  };
  

  const addTask = async (): Promise<void> => {
    const formValues = await showTaskPopup('Tambahkan Tugas Baru');
    if (formValues) {
      const newTask: Omit<Task, 'id'> = {
        text: formValues[0],
        completed: false,
        deadline: formValues[1],
      };
      const docRef = await addDoc(collection(db, 'tasks'), newTask);
      setTasks([...tasks, { id: docRef.id, ...newTask }]);
    }
  };

  const editTask = async (task: Task): Promise<void> => {
    const formValues = await showTaskPopup('Edit Tugas', task);
    if (formValues) {
      const updatedTask = {
        ...task,
        text: formValues[0],
        deadline: formValues[1],
      };

      await updateDoc(doc(db, 'tasks', task.id), {
        text: updatedTask.text,
        deadline: updatedTask.deadline,
      });

      const updatedTasks = tasks.map((t) => (t.id === task.id ? updatedTask : t));
      setTasks(updatedTasks);
    }
  };

  const toggleTask = async (id: string): Promise<void> => {
    const updatedTasks = tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    const taskRef = doc(db, 'tasks', id);
    await updateDoc(taskRef, {
      completed: updatedTasks.find((task) => task.id === id)?.completed,
    });
  };

  const deleteTask = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'tasks', id));
    setTasks(tasks.filter((task) => task.id !== id));
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-[url('/old-papers.jpg')] bg-cover bg-center font-serif text-[#4b3b2a]">
      <div className="max-w-xl mx-auto py-10 px-6 bg-[#f9f1dc]/90 shadow-lg rounded-xl border border-[#b59b7c] backdrop-blur-sm">
        <h1 className="text-4xl font-bold text-center mb-6 tracking-widest italic font-[Cinzel] text-[#5e3b1d] drop-shadow-md">
          📜 Tugas Sang Pengelana
        </h1>
        <div className="flex justify-center mb-4">
          <button
            onClick={addTask}
            className="bg-gradient-to-b from-[#a67c52] to-[#744d29] hover:brightness-110 text-white px-6 py-2 rounded-full shadow-lg tracking-wide font-medium font-[Cinzel] transition-all duration-300"
          >
            ✍🏻 Tambahkan Tugas
          </button>
        </div>
        <ul className="space-y-4">
          <AnimatePresence>
            {tasks.map((task) => {
              const timeLeft = calculateTimeRemaining(task.deadline);
              const isExpired = timeLeft === 'Waktu habis!';
              const taskColor = task.completed
                ? 'bg-[#ede3cf] border-[#a1654e] border-2 border-dashed'
                : isExpired
                ? 'bg-[#f8d6c4] border border-[#b27676]'
                : 'bg-[#fdf5e6] border border-[#d6b98c]';

              return (
                <motion.li
                  key={task.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`p-4 rounded-lg shadow-md shadow-[#7a5e3a40] ${taskColor} font-[Georgia]`}
                >
                  <div className="flex justify-between items-start">
                    <span
                      onClick={() => toggleTask(task.id)}
                      className={`cursor-pointer text-lg ${task.completed ? 'italic text-red-800 font-semibold' : 'text-[#3a2d1e]'}`}
                    >
                      {task.text}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => editTask(task)}
                        className="text-sm text-[#4b3b2a] px-2 py-1 bg-[#d9c7aa] hover:bg-[#c4b293] border border-[#4b3b2a] rounded"
                      >
                        🪶
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-sm text-[#4b3b2a] px-2 py-1 bg-[#d9c7aa] hover:bg-[#bba886] border border-[#4b3b2a] rounded"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                  <p className="text-sm mt-1 text-[#5b4530] font-medium">
                    Deadline: {new Date(task.deadline).toLocaleString()}
                  </p>
                  <p className="text-xs font-medium text-gray-700">
                    ⏳ {timeRemaining[task.id] || '--:--:--'}
                  </p>
                  {task.completed && (
                    <div className="text-[#5c3d1a] font-bold text-sm italic rotate-[-2deg] opacity-95 border-2 border-[#5c3d1a] px-3 py-1 w-fit mt-2 bg-[#f5e7c5] shadow-md tracking-wide">
                      ✅ SELESAI
                    </div>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}
