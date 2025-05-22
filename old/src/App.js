import React, { useState } from 'react';
import { Switch } from '@headlessui/react';
import { MathJax } from 'mathjax-react';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

function App() {
  const [currentScreen, setCurrentScreen] = useState('main-menu');
  const [operation, setOperation] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [supportMode, setSupportMode] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);

  const operations = [
    { id: 'addition', name: 'Сложение' },
    { id: 'subtraction', name: 'Вычитание' },
    { id: 'multiplication', name: 'Умножение' },
    { id: 'division', name: 'Деление' },
    { id: 'mixed', name: 'Смешанный режим' },
    { id: 'life', name: 'Жизненные задачи' }
  ];

  const difficulties = [
    { id: 'easy', name: 'Лёгкий (1-10)' },
    { id: 'medium', name: 'Средний (10-100)' },
    { id: 'hard', name: 'Сложный (100-1000)' },
    { id: 'life', name: 'Жизнь (покупки)' }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Main Menu */}
        {currentScreen === 'main-menu' && (
          <div className="bg-white shadow sm:rounded-lg p-6">
            <h1 className="text-3xl font-bold text-center mb-8">Математический тренажёр</h1>
            
            <div className="space-y-8">
              {/* Operations */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Выберите операцию:</h2>
                <div className="grid grid-cols-2 gap-4">
                  {operations.map((op) => (
                    <button
                      key={op.id}
                      onClick={() => setOperation(op.id)}
                      className={classNames(
                        'px-4 py-2 rounded-md text-sm font-medium',
                        operation === op.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {op.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulties */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Выберите сложность:</h2>
                <div className="grid grid-cols-2 gap-4">
                  {difficulties.map((diff) => (
                    <button
                      key={diff.id}
                      onClick={() => setDifficulty(diff.id)}
                      className={classNames(
                        'px-4 py-2 rounded-md text-sm font-medium',
                        difficulty === diff.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {diff.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Support Mode */}
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Режим подсказок</span>
                <Switch
                  checked={supportMode}
                  onChange={setSupportMode}
                  className={classNames(
                    supportMode ? 'bg-blue-600' : 'bg-gray-200',
                    'relative inline-flex h-6 w-11 items-center rounded-full'
                  )}
                >
                  <span
                    className={classNames(
                      supportMode ? 'translate-x-6' : 'translate-x-1',
                      'inline-block h-4 w-4 transform rounded-full bg-white transition'
                    )}
                  />
                </Switch>
              </div>

              <button
                onClick={() => setCurrentScreen('game')}
                disabled={!operation || !difficulty}
                className={classNames(
                  'w-full py-2 px-4 rounded-md text-white font-medium',
                  !operation || !difficulty
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                )}
              >
                Начать
              </button>
            </div>
          </div>
        )}

        {/* Game Screen */}
        {currentScreen === 'game' && (
          <div className="bg-white shadow sm:rounded-lg p-6">
            <div className="flex justify-between mb-6">
              <div className="space-x-4">
                <span>Правильно: {correctCount}</span>
                <span>Неправильно: {incorrectCount}</span>
              </div>
              <div>Осталось времени: {timeLeft}с</div>
            </div>
            
            {/* Game content will go here */}
          </div>
        )}

        {/* Results Screen */}
        {currentScreen === 'results' && (
          <div className="bg-white shadow sm:rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Результаты</h2>
            <div className="space-y-4">
              <p>Правильных ответов: {correctCount}</p>
              <p>Неправильных ответов: {incorrectCount}</p>
              <p>Процент правильных ответов: {Math.round((correctCount / (correctCount + incorrectCount)) * 100)}%</p>
            </div>
            <div className="mt-6 space-x-4">
              <button
                onClick={() => setCurrentScreen('main-menu')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Играть снова
              </button>
              <button
                onClick={() => setCurrentScreen('history')}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
              >
                История результатов
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 