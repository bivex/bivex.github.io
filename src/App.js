import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Switch } from '@headlessui/react';
import MathJaxComponent from './components/MathJaxComponent';

// Sound effects
let audioContext = null;
let correctSound = null;
let incorrectSound = null;

const initAudio = () => {
  if (audioContext) return; // Already initialized

  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const createSound = (frequency, type = 'sine', duration = 0.1) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      return { play: () => {
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
        const newOscillator = audioContext.createOscillator();
        const newGainNode = audioContext.createGain();
        
        newOscillator.type = type;
        newOscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        newGainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        
        newOscillator.connect(newGainNode);
        newGainNode.connect(audioContext.destination);
        
        newOscillator.start();
        newOscillator.stop(audioContext.currentTime + duration);
      }};
    };

    correctSound = createSound(800, 'sine', 0.1);
    incorrectSound = createSound(400, 'sawtooth', 0.2);
  } catch (e) {
    console.warn('Web Audio API not supported:', e);
    correctSound = { play: () => {} };
    incorrectSound = { play: () => {} };
  }
};

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Log entry component
const LogEntry = ({ entry }) => (
  <div className="p-3 bg-white/50 rounded-lg shadow-sm mb-2">
    <div className="flex justify-between items-center text-sm">
      <span className="font-medium text-gray-700">{entry.operation}</span>
      <span className="text-gray-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
    </div>
    <div className="mt-1 text-gray-600">
      {entry.operation === 'Ответ' ? (
        <div>
          <MathJaxComponent math={entry.expression} />
          <span className="mx-2">=</span>
          <span className="font-medium">{entry.result}</span>
        </div>
      ) : (
        <div>
          <MathJaxComponent math={`$${entry.expression} = ${entry.result}$`} />
        </div>
      )}
    </div>
    {entry.isCorrect !== undefined && (
      <div className={`mt-1 text-sm ${entry.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
        {entry.isCorrect ? '✓ Правильно' : '✗ Неправильно'}
      </div>
    )}
  </div>
);

// Console logging utility
const log = {
  info: (message, data) => {
    console.log(`%c[INFO] ${message}`, 'color: #3B82F6', data || '');
  },
  success: (message, data) => {
    console.log(`%c[SUCCESS] ${message}`, 'color: #10B981', data || '');
  },
  error: (message, data) => {
    console.log(`%c[ERROR] ${message}`, 'color: #EF4444', data || '');
  },
  warn: (message, data) => {
    console.log(`%c[WARN] ${message}`, 'color: #F59E0B', data || '');
  },
  debug: (message, data) => {
    console.log(`%c[DEBUG] ${message}`, 'color: #6B7280', data || '');
  }
};

function App() {
  const [currentScreen, setCurrentScreen] = useState('main-menu');
  const [operation, setOperation] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [supportMode, setSupportMode] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [currentProblem, setCurrentProblem] = useState(null);
  const [answerOptions, setAnswerOptions] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [isGameActive, setIsGameActive] = useState(false);
  const [operationLogs, setOperationLogs] = useState([]);

  const operations = useMemo(() => [
    { id: 'addition', name: 'Сложение', symbol: '+' },
    { id: 'subtraction', name: 'Вычитание', symbol: '-' },
    { id: 'multiplication', name: 'Умножение', symbol: '\\times' },
    { id: 'division', name: 'Деление', symbol: '\\div' },
    { id: 'mixed', name: 'Смешанный режим', symbol: '?' },
    { id: 'life', name: 'Жизненные задачи', symbol: '?' }
  ], []);

  const difficulties = useMemo(() => [
    { id: 'easy', name: 'Лёгкий (1-10)', range: [1, 10] },
    { id: 'medium', name: 'Средний (10-100)', range: [10, 100] },
    { id: 'hard', name: 'Сложный (100-1000)', range: [100, 1000] },
    { id: 'life', name: 'Жизнь (покупки)', range: [1, 1000] }
  ], []);

  // Add log entry function
  const addLogEntry = useCallback((entry) => {
    log.debug('Adding log entry', entry);
    setOperationLogs(prev => [{
      timestamp: new Date().toISOString(),
      ...entry
    }, ...prev].slice(0, 10));
  }, []);

  // Timer effect
  useEffect(() => {
    let timer;
    if (isGameActive && timeLeft > 0) {
      log.debug('Starting game timer', { timeLeft });
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) {
        log.debug('Cleaning up timer');
        clearInterval(timer);
      }
    };
  }, [isGameActive]);

  // Separate effect to handle game end
  useEffect(() => {
    if (timeLeft === 0 && isGameActive) {
      log.info('Game time ended');
      setIsGameActive(false);
      setCurrentScreen('results');
    }
  }, [timeLeft, isGameActive, setCurrentScreen]);

  const generateProblem = useCallback(() => {
    if (!operation || !difficulty) {
      log.warn('Cannot generate problem: missing operation or difficulty');
      return;
    }

    log.info('Generating new problem', { operation, difficulty });

    const selectedOperation = operations.find(op => op.id === operation);
    const selectedDifficulty = difficulties.find(diff => diff.id === difficulty);
    const [min, max] = selectedDifficulty.range;

    let num1, num2, answer;
    let operationName = selectedOperation.name;

    // Handle mixed operation first
    if (operation === 'mixed') {
      const basicOperations = ['addition', 'subtraction', 'multiplication', 'division'];
      const randomOp = basicOperations[Math.floor(Math.random() * basicOperations.length)];
      log.debug('Mixed operation selected', { randomOp });
      
      switch (randomOp) {
        case 'addition':
          num1 = Math.floor(Math.random() * (max - min + 1)) + min;
          num2 = Math.floor(Math.random() * (max - min + 1)) + min;
          answer = num1 + num2;
          selectedOperation.symbol = '+';
          operationName = 'Сложение';
          break;
        case 'subtraction':
          num1 = Math.floor(Math.random() * (max - min + 1)) + min;
          num2 = Math.floor(Math.random() * (num1 - min + 1)) + min;
          answer = num1 - num2;
          selectedOperation.symbol = '-';
          operationName = 'Вычитание';
          break;
        case 'multiplication':
          // For medium difficulty, use smaller numbers
          const multMax = difficulty === 'medium' ? 12 : max;
          num1 = Math.floor(Math.random() * (multMax - min + 1)) + min;
          num2 = Math.floor(Math.random() * (multMax - min + 1)) + min;
          answer = num1 * num2;
          selectedOperation.symbol = '\\times';
          operationName = 'Умножение';
          break;
        case 'division':
          // For medium difficulty, use multiplication table numbers
          if (difficulty === 'medium') {
            num2 = Math.floor(Math.random() * 10) + 1; // 1-10
            const multiplier = Math.floor(Math.random() * 10) + 1; // 1-10
            num1 = num2 * multiplier;
            answer = multiplier;
          } else {
            num2 = Math.floor(Math.random() * (max - min + 1)) + min;
            if (num2 === 1) num2 = 2;
            const multiplier = Math.floor(Math.random() * (max / num2)) + 1;
            num1 = num2 * multiplier;
            answer = multiplier;
          }
          selectedOperation.symbol = '\\div';
          operationName = 'Деление';
          break;
        default:
          // Fallback to addition
          num1 = Math.floor(Math.random() * (max - min + 1)) + min;
          num2 = Math.floor(Math.random() * (max - min + 1)) + min;
          answer = num1 + num2;
          selectedOperation.symbol = '+';
          operationName = 'Сложение';
          break;
      }
    } else {
      switch (operation) {
        case 'addition':
          num1 = Math.floor(Math.random() * (max - min + 1)) + min;
          num2 = Math.floor(Math.random() * (max - min + 1)) + min;
          answer = num1 + num2;
          break;
        case 'subtraction':
          num1 = Math.floor(Math.random() * (max - min + 1)) + min;
          num2 = Math.floor(Math.random() * (num1 - min + 1)) + min;
          answer = num1 - num2;
          break;
        case 'multiplication':
          // For medium difficulty, use smaller numbers
          const multMax = difficulty === 'medium' ? 12 : max;
          num1 = Math.floor(Math.random() * (multMax - min + 1)) + min;
          num2 = Math.floor(Math.random() * (multMax - min + 1)) + min;
          answer = num1 * num2;
          break;
        case 'division':
          // For medium difficulty, use multiplication table numbers
          if (difficulty === 'medium') {
            num2 = Math.floor(Math.random() * 10) + 1; // 1-10
            const multiplier = Math.floor(Math.random() * 10) + 1; // 1-10
            num1 = num2 * multiplier;
            answer = multiplier;
          } else {
            num2 = Math.floor(Math.random() * (max - min + 1)) + min;
            if (num2 === 1) num2 = 2;
            const multiplier = Math.floor(Math.random() * (max / num2)) + 1;
            num1 = num2 * multiplier;
            answer = multiplier;
          }
          break;
        case 'life':
          const scenarios = [
            {
              type: 'shopping',
              generate: () => {
                const price = Math.floor(Math.random() * (max - min + 1)) + min;
                const quantity = Math.floor(Math.random() * 5) + 1;
                num1 = price;
                num2 = quantity;
                answer = price * quantity;
                operationName = 'Покупка';
                return `Цена товара: ${price}₽. Сколько будет стоить ${quantity} шт.?`;
              }
            },
            {
              type: 'change',
              generate: () => {
                const total = Math.floor(Math.random() * (max - min + 1)) + min;
                const paid = Math.ceil(total / 100) * 100;
                num1 = paid;
                num2 = total;
                answer = paid - total;
                operationName = 'Сдача';
                return `Сумма покупки: ${total}₽. Сколько сдачи с ${paid}₽?`;
              }
            }
          ];
          const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
          const problem = scenario.generate();
          setCurrentProblem(problem);
          break;
        default:
          return;
      }
    }

    // Log the generated problem
    if (operation !== 'life') {
      const logEntry = {
        operation: operationName,
        expression: `${num1} ${selectedOperation.symbol} ${num2}`,
        result: answer,
        difficulty: selectedDifficulty.name
      };
      log.info('Problem generated', logEntry);
      addLogEntry(logEntry);

      // Store the current problem and answer in state
      setCurrentProblem({
        expression: `$${num1} ${selectedOperation.symbol} ${num2} = ?$`,
        answer: answer
      });

      // Generate answer options with better distribution
      const generateOptions = (correctAnswer, operation) => {
        const options = [correctAnswer];
        const maxAttempts = 20;
        let attempts = 0;

        while (options.length < 4 && attempts < maxAttempts) {
          attempts++;
          let option;
          
          if (operation === 'division' || (operation === 'mixed' && selectedOperation.symbol === '\\div')) {
            // For division, generate options closer to the correct answer
            const offset = Math.floor(Math.random() * 2) + 1;
            option = correctAnswer + (Math.random() > 0.5 ? offset : -offset);
          } else if (operation === 'multiplication' || (operation === 'mixed' && selectedOperation.symbol === '\\times')) {
            // For multiplication, generate options with smaller offsets
            const offset = Math.floor(Math.random() * 3) + 1;
            option = correctAnswer + (Math.random() > 0.5 ? offset : -offset);
          } else {
            // For addition and subtraction, scale the offset based on the answer
            const range = Math.max(5, Math.floor(correctAnswer * 0.2)); // 20% of correct answer
            const offset = Math.floor(Math.random() * range) + 1;
            const sign = Math.random() > 0.5 ? 1 : -1;
            option = correctAnswer + (offset * sign);
          }
          
          // Ensure options are positive and unique
          if (option > 0 && !options.includes(option)) {
            options.push(option);
          }
        }

        // If we couldn't generate enough options, fill with fallback values
        while (options.length < 4) {
          const fallback = correctAnswer + (options.length * 2);
          if (!options.includes(fallback)) {
            options.push(fallback);
          }
        }

        return options.sort(() => Math.random() - 0.5);
      };

      // Generate and set answer options
      const options = generateOptions(answer, operation);
      log.debug('Generated answer options', { options, correctAnswer: answer });
      setAnswerOptions(options);
    }
  }, [operation, difficulty, operations, difficulties, addLogEntry]);

  const handleAnswer = (selectedAnswer) => {
    const correctAnswer = currentProblem.answer;
    const isCorrect = selectedAnswer === correctAnswer;

    log.info('Answer submitted', {
      selectedAnswer,
      correctAnswer,
      isCorrect,
      currentProblem: currentProblem.expression
    });

    // Play sound effect
    if (isCorrect) {
      try {
        correctSound.play();
      } catch (e) {
        log.warn('Could not play success sound', e);
      }
    } else {
      try {
        incorrectSound.play();
      } catch (e) {
        log.warn('Could not play fail sound', e);
      }
    }

    // Log the answer with proper MathJax formatting
    addLogEntry({
      operation: 'Ответ',
      expression: currentProblem.expression.replace('= ?', `= ${selectedAnswer}`),
      result: correctAnswer,
      isCorrect
    });

    if (isCorrect) {
      log.success('Correct answer!');
      setCorrectCount(prev => prev + 1);
      setFeedback({ type: 'correct', message: 'Правильно!' });
    } else {
      log.warn('Incorrect answer', { selectedAnswer, correctAnswer });
      setIncorrectCount(prev => prev + 1);
      setFeedback({ type: 'incorrect', message: `Неправильно. Правильный ответ: ${correctAnswer}` });
    }

    // Generate new problem immediately
    setFeedback(null);
    generateProblem();
  };

  // Start game
  const startGame = () => {
    initAudio(); // Initialize audio when starting the game
    log.info('Starting new game', { operation, difficulty, supportMode });
    setCurrentScreen('game');
    setTimeLeft(120);
    setIsGameActive(true);
    setCorrectCount(0);
    setIncorrectCount(0);
    generateProblem();
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Log screen changes
  useEffect(() => {
    log.info('Screen changed', { currentScreen });
  }, [currentScreen]);

  // Log operation changes
  useEffect(() => {
    if (operation) {
      log.debug('Operation selected', { operation });
    }
  }, [operation]);

  // Log difficulty changes
  useEffect(() => {
    if (difficulty) {
      log.debug('Difficulty selected', { difficulty });
    }
  }, [difficulty]);

  // Log support mode changes
  useEffect(() => {
    log.debug('Support mode changed', { supportMode });
  }, [supportMode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Математический тренажёр
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* Main Menu */}
        {currentScreen === 'main-menu' && (
          <div className="bg-white/80 backdrop-blur-sm shadow-xl sm:rounded-2xl p-4 sm:p-8 border border-gray-100">
            <div className="space-y-6 sm:space-y-8">
              {/* Operations */}
              <section aria-labelledby="operations-heading">
                <h2 id="operations-heading" className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">Выберите операцию:</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {operations.map((op) => (
                    <button
                      key={op.id}
                      onClick={() => setOperation(op.id)}
                      className={classNames(
                        'px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105',
                        operation === op.id
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200'
                          : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm hover:shadow-md'
                      )}
                    >
                      {op.name}
                    </button>
                  ))}
                </div>
              </section>

              {/* Difficulties */}
              <section aria-labelledby="difficulties-heading">
                <h2 id="difficulties-heading" className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">Выберите сложность:</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {difficulties.map((diff) => (
                    <button
                      key={diff.id}
                      onClick={() => setDifficulty(diff.id)}
                      className={classNames(
                        'px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105',
                        difficulty === diff.id
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200'
                          : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm hover:shadow-md'
                      )}
                    >
                      {diff.name}
                    </button>
                  ))}
                </div>
              </section>

              {/* Support Mode */}
              <section aria-labelledby="support-mode-heading">
                <div id="support-mode-heading" className="flex items-center justify-between p-4 sm:p-6 bg-white/50 rounded-xl shadow-sm">
                  <span className="text-gray-800 font-medium text-sm sm:text-base">Режим подсказок</span>
                  <Switch
                    checked={supportMode}
                    onChange={setSupportMode}
                    className={`${
                      supportMode ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gray-200'
                    } relative inline-flex h-6 sm:h-7 w-12 sm:w-14 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  >
                    <span className="sr-only">Включить режим подсказок</span>
                    <span
                      className={`${
                        supportMode ? 'translate-x-6 sm:translate-x-8' : 'translate-x-1'
                      } inline-block h-4 sm:h-5 w-4 sm:w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out`}
                    />
                  </Switch>
                </div>
              </section>

              <button
                onClick={startGame}
                disabled={!operation || !difficulty}
                className={classNames(
                  'w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl text-white font-medium text-base sm:text-lg transition-all duration-200 transform hover:scale-[1.02]',
                  !operation || !difficulty
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                )}
              >
                Начать
              </button>
            </div>
          </div>
        )}

        {/* Game Screen */}
        {currentScreen === 'game' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
            <div className="lg:col-span-2">
              <section aria-labelledby="game-content-heading" className="bg-white/80 backdrop-blur-sm shadow-xl sm:rounded-2xl p-4 sm:p-8 border border-gray-100">
                <div id="game-content-heading" className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-0 mb-6 sm:mb-8">
                  <div className="flex flex-wrap gap-3 sm:gap-6 text-gray-800">
                    <span className="font-medium bg-blue-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base">Правильно: {correctCount}</span>
                    <span className="font-medium bg-red-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base">Неправильно: {incorrectCount}</span>
                  </div>
                  <div className={classNames(
                    'font-mono text-base sm:text-lg font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-center sm:text-left',
                    timeLeft <= 30 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                  )}>
                    Осталось времени: {formatTime(timeLeft)}
                  </div>
                </div>
                
                <div className="problem text-2xl sm:text-3xl text-center my-8 sm:my-12 bg-white/50 p-4 sm:p-8 rounded-xl shadow-sm">
                  {currentProblem && <MathJaxComponent math={currentProblem.expression} />}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                  {answerOptions.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswer(option)}
                      className="answer-option bg-white hover:bg-gray-50 text-gray-800 font-medium py-4 sm:py-6 px-4 sm:px-8 rounded-xl text-lg sm:text-xl transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {feedback && (
                  <div className={`mt-6 sm:mt-8 p-4 sm:p-6 rounded-xl text-center font-medium text-base sm:text-lg ${
                    feedback.type === 'correct' 
                      ? 'bg-green-50 text-green-700 border border-green-100' 
                      : 'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                    {feedback.message}
                  </div>
                )}
              </section>
            </div>
            <aside className="lg:col-span-1">
              <section aria-labelledby="operation-history-heading" className="bg-white/80 backdrop-blur-sm shadow-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100">
                <h3 id="operation-history-heading" className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">История операций</h3>
                <div className="space-y-2 max-h-[400px] sm:max-h-[600px] overflow-y-auto">
                  {operationLogs.map((log, index) => (
                    <LogEntry key={index} entry={log} />
                  ))}
                </div>
              </section>
            </aside>
          </div>
        )}

        {/* Results Screen */}
        {currentScreen === 'results' && (
          <section aria-labelledby="results-heading" className="bg-white/80 backdrop-blur-sm shadow-xl sm:rounded-2xl p-4 sm:p-8 border border-gray-100">
            <h2 id="results-heading" className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Результаты
            </h2>
            <div className="space-y-4 sm:space-y-6 text-gray-800 bg-white/50 p-4 sm:p-8 rounded-xl shadow-sm">
              <p className="text-base sm:text-xl flex justify-between items-center">
                <span>Правильных ответов:</span>
                <span className="font-bold text-blue-600">{correctCount}</span>
              </p>
              <p className="text-base sm:text-xl flex justify-between items-center">
                <span>Неправильных ответов:</span>
                <span className="font-bold text-red-600">{incorrectCount}</span>
              </p>
              <p className="text-base sm:text-xl flex justify-between items-center">
                <span>Процент правильных ответов:</span>
                <span className="font-bold text-indigo-600">
                  {Math.round((correctCount / (correctCount + incorrectCount)) * 100)}%
                </span>
              </p>
            </div>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-4 sm:gap-6 sm:justify-center">
              <button
                onClick={() => setCurrentScreen('main-menu')}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg shadow-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Играть снова
              </button>
              <button
                onClick={() => setCurrentScreen('history')}
                className="w-full sm:w-auto bg-white text-gray-800 px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-medium hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                История результатов
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App; 