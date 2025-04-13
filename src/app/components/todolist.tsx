'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
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
        newTimeRemaining[task.id] = calculateTimeRemaining(task.deadline);
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

  const addTask = async (): Promise<void> => {
    const { value: formValues } = await Swal.fire({
      title: 'Tambahkan tugas baru',
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Nama tugas">' +
        '<input id="swal-input2" type="datetime-local" class="swal2-input">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Tambah',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        return [
          (document.getElementById('swal-input1') as HTMLInputElement)?.value,
          (document.getElementById('swal-input2') as HTMLInputElement)?.value,
        ];
      },
    });

    if (formValues && formValues[0] && formValues[1]) {
      const newTask: Omit<Task, 'id'> = {
        text: formValues[0],
        completed: false,
        deadline: formValues[1],
      };
      const docRef = await addDoc(collection(db, 'tasks'), newTask);
      setTasks([...tasks, { id: docRef.id, ...newTask }]);
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

  const editTask = async (task: Task): Promise<void> => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit tugas',
      html:
        `<input id="swal-input1" class="swal2-input" value="${task.text}" placeholder="Nama tugas">` +
        `<input id="swal-input2" type="datetime-local" class="swal2-input" value="${task.deadline}">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        return [
          (document.getElementById('swal-input1') as HTMLInputElement)?.value,
          (document.getElementById('swal-input2') as HTMLInputElement)?.value,
        ];
      },
    });

    if (formValues && formValues[0] && formValues[1]) {
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

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-[url('/old-paper.jpeg')] bg-cover bg-center font-serif text-[#4b3b2a]">
      <div className="max-w-xl mx-auto py-10 px-6 bg-white/70 shadow-lg rounded-xl border border-[#d3b99f]">
        <h1 className="text-3xl font-bold text-center mb-6 tracking-widest italic">
          📜 Daftar Tugas Harian
        </h1>
        <div className="flex justify-center mb-4">
          <button
            onClick={addTask}
            className="bg-[#8b5e3c] hover:bg-[#6d472c] text-white px-5 py-2 rounded-full shadow-md transition-all"
          >
            Tambahkan Tugas 🖊️ 
          </button>
        </div>
        <ul className="space-y-4">
          <AnimatePresence>
            {tasks.map((task) => {
              const timeLeft = calculateTimeRemaining(task.deadline);
              const isExpired = timeLeft === 'Waktu habis!';
              const taskColor = task.completed
                ? 'bg-[#e8dcc3] border-red-600 border-2 border-dashed'
                : isExpired
                ? 'bg-[#f2c2b3] border border-red-300'
                : 'bg-[#fff8e1] border border-yellow-300';

              return (
                <motion.li
                  key={task.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`p-4 rounded-lg ${taskColor}`}
                >
                  <div className="flex justify-between items-start">
                    <span
                      onClick={() => toggleTask(task.id)}
                      className={`cursor-pointer text-lg ${
                        task.completed
                          ? 'italic text-red-800 font-semibold'
                          : 'text-gray-800'
                      }`}
                    >
                      {task.text}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => editTask(task)}
                        className="text-sm text-white px-2 py-1 bg-blue-600 hover:bg-blue-800 rounded"
                      >
                        🖊️
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-sm text-white px-2 py-1 bg-red-600 hover:bg-red-800 rounded"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <p className="text-sm mt-1">
                    Deadline: {new Date(task.deadline).toLocaleString()}
                  </p>
                  <p className="text-xs font-medium text-gray-700">
                    ⏳ {timeRemaining[task.id] || 'Menghitung...'}
                  </p>
                  {task.completed && (
                    <div className="text-red-700 font-bold text-sm italic rotate-[-6deg] opacity-80 border-2 border-red-700 px-3 py-1 w-fit mt-2 shadow-sm">
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
