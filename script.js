/**
 * Copyright (c) 2025 [Your Name], Individual Entrepreneur
 * INN: [Your Tax ID Number]
 * Created: 2025-05-22 04:14
 * Last Updated: 2025-05-22 04:34
 * All rights reserved. Unauthorized copying, modification,
 * distribution, or use is strictly prohibited.
 */

// Звуковые эффекты
let audioContext = null;
let correctSound = null;
let incorrectSound = null;

const initAudio = () => {
    if (audioContext) return; // Уже инициализирован

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
        console.warn('Web Audio API не поддерживается:', e);
        correctSound = { play: () => {} };
        incorrectSound = { play: () => {} };
    }
};

// Состояние игры
const gameState = {
    operation: null,
    difficulty: null,
    correctCount: 0,
    incorrectCount: 0,
    timeLeft: 120,
    timer: null,
    currentProblem: null,
    streak: 0, // Серия правильных ответов
    bestStreak: 0, // Лучшая серия
    totalProblems: 0, // Общее количество задач
    startTime: null, // Время начала игры
    averageTime: 0 // Среднее время на задачу
};

// Элементы DOM
const screens = {
    mainMenu: document.getElementById('main-menu'),
    gameScreen: document.getElementById('game-screen'),
    resultsScreen: document.getElementById('results-screen')
};

const elements = {
    startButton: document.getElementById('start-button'),
    playAgain: document.getElementById('play-again'),
    problem: document.getElementById('problem'),
    feedback: document.getElementById('feedback'),
    correctCount: document.getElementById('correct-count'),
    incorrectCount: document.getElementById('incorrect-count'),
    timeLeft: document.getElementById('time-left'),
    finalCorrect: document.getElementById('final-correct'),
    finalIncorrect: document.getElementById('final-incorrect'),
    accuracy: document.getElementById('accuracy'),
    answerOptions: document.querySelectorAll('.answer-option'),
    supportMode: document.getElementById('support-mode'),
    hints: document.getElementById('hints'),
    showHistory: document.getElementById('show-history'),
    backToResults: document.getElementById('back-to-results'),
    historyList: document.querySelector('.history-list')
};

// Диапазоны чисел для разных уровней сложности
const difficultyRanges = {
    easy: { min: 1, max: 10 },
    medium: { min: 10, max: 100 },
    hard: { min: 100, max: 1000 },
    life: { min: 1, max: 1000 } // Для жизненных задач
};

// Список товаров для жизненных задач
const products = [
    { name: 'хлеб', price: 45, unit: 'буханка' },
    { name: 'молоко', price: 89, unit: 'литр' },
    { name: 'яблоки', price: 129, unit: 'кг' },
    { name: 'картофель', price: 59, unit: 'кг' },
    { name: 'макароны', price: 79, unit: 'пачка' },
    { name: 'рис', price: 99, unit: 'пачка' },
    { name: 'сахар', price: 69, unit: 'кг' },
    { name: 'масло', price: 149, unit: 'пачка' },
    { name: 'сыр', price: 399, unit: 'кг' },
    { name: 'колбаса', price: 499, unit: 'кг' },
    { name: 'яйца', price: 129, unit: 'десяток' },
    { name: 'чай', price: 199, unit: 'пачка' },
    { name: 'кофе', price: 299, unit: 'пачка' },
    { name: 'печенье', price: 89, unit: 'пачка' },
    { name: 'шоколад', price: 119, unit: 'плитка' }
];

// Инициализация игры
function initGame() {
    // Обработчики для кнопок операций
    document.querySelectorAll('[data-operation]').forEach(button => {
        button.addEventListener('click', () => {
            initAudio(); // Инициализируем аудио при первом клике
            document.querySelectorAll('[data-operation]').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            gameState.operation = button.dataset.operation;
        });
    });

    // Обработчики для кнопок сложности
    document.querySelectorAll('[data-difficulty]').forEach(button => {
        button.addEventListener('click', () => {
            initAudio(); // Инициализируем аудио при первом клике
            document.querySelectorAll('[data-difficulty]').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            gameState.difficulty = button.dataset.difficulty;
        });
    });

    // Обработчики для основных кнопок
    elements.startButton.addEventListener('click', () => {
        initAudio(); // Инициализируем аудио при старте игры
        startGame();
    });
    elements.playAgain.addEventListener('click', resetGame);
}

// Генерация случайного числа в заданном диапазоне
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Генерация подсказок для разных операций
function generateHints(operation, num1, num2, answer) {
    const hints = [];
    
    if (operation === 'life') {
        const problem = gameState.currentProblem;
        
        // Шаг 1: Расчет стоимости каждого товара с разбивкой на простые числа
        let step1Text = '<div class="hint-calculations">';
        step1Text += '<div class="hint-step-title">Шаг 1: Посчитаем стоимость каждого товара</div>';
        
        problem.products.forEach(({ product, quantity, cost }) => {
            // Разбиваем цену на удобные для умножения числа
            const price = product.price;
            const priceBreakdown = price < 100 ? 
                `${price}` : 
                `${Math.floor(price/10)*10} + ${price%10}`;
            
            // Разбиваем умножение на простые шаги
            const calculationSteps = [];
            if (quantity > 1) {
                calculationSteps.push(`\\[${quantity} \\times ${price} =\\]`);
                calculationSteps.push(`\\[${quantity} \\times (${priceBreakdown}) =\\]`);
                if (price >= 100) {
                    calculationSteps.push(`\\[${quantity} \\times ${Math.floor(price/10)*10} + ${quantity} \\times ${price%10} =\\]`);
                    calculationSteps.push(`\\[${quantity * Math.floor(price/10)*10} + ${quantity * (price%10)} =\\]`);
                }
            }
            calculationSteps.push(`\\[${cost}\\] м.`);
            
            step1Text += `
                <div class="hint-calculation-item">
                    <span class="hint-product-name">${product.name}:</span>
                    <span class="hint-calculation">
                        ${calculationSteps.join('<br>')}
                    </span>
                </div>
            `;
        });
        step1Text += '</div>';
        
        hints.push({
            title: 'Шаг 1: Расчет стоимости каждого товара',
            text: step1Text
        });

        // Шаг 2: Суммирование всех стоимостей с группировкой
        let step2Text = '<div class="hint-calculations">';
        step2Text += '<div class="hint-step-title">Шаг 2: Сложим все стоимости</div>';
        
        const costs = problem.products.map(p => p.cost);
        // Группируем числа для удобного сложения
        const groupedCosts = [];
        let currentSum = 0;
        
        // Сначала группируем числа, кратные 100
        const hundreds = costs.filter(cost => cost % 100 === 0);
        const nonHundreds = costs.filter(cost => cost % 100 !== 0);
        
        if (hundreds.length > 0) {
            const hundredsSum = hundreds.reduce((a, b) => a + b, 0);
            groupedCosts.push(`\\[${hundreds.join(' + ')} = ${hundredsSum}\\]`);
            currentSum = hundredsSum;
        }
        
        // Затем добавляем остальные числа
        nonHundreds.forEach((cost, index) => {
            if (index === 0 && currentSum === 0) {
                currentSum = cost;
            } else {
                currentSum += cost;
                groupedCosts.push(`\\[${groupedCosts.length > 0 ? currentSum - cost : cost} + ${cost} = ${currentSum}\\]`);
            }
        });
        
        step2Text += `
            <div class="hint-calculation-item">
                <span class="hint-calculation">
                    ${groupedCosts.join('<br>')} м.
                </span>
            </div>
        `;
        step2Text += '</div>';
        
        hints.push({
            title: 'Шаг 2: Суммирование всех стоимостей',
            text: step2Text
        });

        // Шаг 3: Проверка с округлением
        let step3Text = '<div class="hint-calculations">';
        step3Text += '<div class="hint-step-title">Шаг 3: Проверка</div>';
        step3Text += `
            <div class="hint-total">
                Итого: \\[${answer}\\] м.
                <br>
                <small>Проверка: \\[${costs.join(' + ')} = ${answer}\\] м.</small>
            </div>
        `;
        step3Text += '</div>';
        
        hints.push({
            title: 'Шаг 3: Проверка',
            text: step3Text
        });
    } else {
        switch (operation) {
            case 'addition':
                if (num1 > 10 || num2 > 10) {
                    const tens1 = Math.floor(num1/10)*10;
                    const ones1 = num1%10;
                    const tens2 = Math.floor(num2/10)*10;
                    const ones2 = num2%10;
                    const sumTens = tens1 + tens2;
                    const sumOnes = ones1 + ones2;
                    const finalSum = sumTens + sumOnes;

                    hints.push({
                        title: 'Шаг 1: Разбейте числа на десятки и единицы',
                        text: `Разложим каждое число на десятки и единицы:\n\\[${num1} = ${tens1} + ${ones1}\\]\n\\[${num2} = ${tens2} + ${ones2}\\]`
                    });
                    hints.push({
                        title: 'Шаг 2: Сложите десятки',
                        text: `Сначала сложим десятки:\n\\[${tens1} + ${tens2} = ${sumTens}\\]`
                    });
                    hints.push({
                        title: 'Шаг 3: Сложите единицы',
                        text: `Теперь сложим единицы:\n\\[${ones1} + ${ones2} = ${sumOnes}\\]`
                    });
                    hints.push({
                        title: 'Шаг 4: Сложите результаты',
                        text: `Сложим результаты предыдущих шагов:\n\\[${sumTens} + ${sumOnes} = ${finalSum}\\]\n\nИтак, ${num1} + ${num2} = ${finalSum}`
                    });
                }
                break;

            case 'subtraction':
                if (num1 > 10 || num2 > 10) {
                    const tens1 = Math.floor(num1/10)*10;
                    const ones1 = num1%10;
                    const tens2 = Math.floor(num2/10)*10;
                    const ones2 = num2%10;
                    let newTens1 = tens1;
                    let newOnes1 = ones1;

                    hints.push({
                        title: 'Шаг 1: Разбейте числа на десятки и единицы',
                        text: `Разложим каждое число на десятки и единицы:\n\\[${num1} = ${tens1} + ${ones1}\\]\n\\[${num2} = ${tens2} + ${ones2}\\]`
                    });

                    if (ones1 < ones2) {
                        newTens1 = tens1 - 10;
                        newOnes1 = ones1 + 10;
                        hints.push({
                            title: 'Шаг 2: Займите десяток',
                            text: `Так как ${ones1} < ${ones2}, занимаем десяток:\n\\[${tens1} + ${ones1} = ${newTens1} + ${newOnes1}\\]`
                        });
                    }

                    const diffTens = newTens1 - tens2;
                    const diffOnes = newOnes1 - ones2;
                    const finalDiff = diffTens + diffOnes;

                    hints.push({
                        title: 'Шаг 3: Вычтите десятки',
                        text: `Вычитаем десятки:\n\\[${newTens1} - ${tens2} = ${diffTens}\\]`
                    });
                    hints.push({
                        title: 'Шаг 4: Вычтите единицы',
                        text: `Вычитаем единицы:\n\\[${newOnes1} - ${ones2} = ${diffOnes}\\]`
                    });
                    hints.push({
                        title: 'Шаг 5: Сложите результаты',
                        text: `Сложим результаты предыдущих шагов:\n\\[${diffTens} + ${diffOnes} = ${finalDiff}\\]\n\nИтак, ${num1} - ${num2} = ${finalDiff}`
                    });
                }
                break;

            case 'multiplication':
                if (num1 > 10 || num2 > 10) {
                    const tens1 = Math.floor(num1/10)*10;
                    const ones1 = num1%10;
                    const tens2 = Math.floor(num2/10)*10;
                    const ones2 = num2%10;

                    hints.push({
                        title: 'Шаг 1: Разбейте числа на десятки и единицы',
                        text: `Разложим каждое число на десятки и единицы:\n\\[${num1} = ${tens1} + ${ones1}\\]\n\\[${num2} = ${tens2} + ${ones2}\\]`
                    });

                    const tensByTens = tens1 * tens2;
                    const tensByOnes = tens1 * ones2;
                    const onesByTens = ones1 * tens2;
                    const onesByOnes = ones1 * ones2;

                    hints.push({
                        title: 'Шаг 2: Умножьте десятки',
                        text: `Умножаем десятки первого числа на десятки второго:\n\\[${tens1} \\times ${tens2} = ${tensByTens}\\]`
                    });
                    hints.push({
                        title: 'Шаг 3: Умножьте десятки на единицы',
                        text: `Умножаем десятки первого числа на единицы второго:\n\\[${tens1} \\times ${ones2} = ${tensByOnes}\\]`
                    });
                    hints.push({
                        title: 'Шаг 4: Умножьте единицы на десятки',
                        text: `Умножаем единицы первого числа на десятки второго:\n\\[${ones1} \\times ${tens2} = ${onesByTens}\\]`
                    });
                    hints.push({
                        title: 'Шаг 5: Умножьте единицы',
                        text: `Умножаем единицы первого числа на единицы второго:\n\\[${ones1} \\times ${ones2} = ${onesByOnes}\\]`
                    });
                    hints.push({
                        title: 'Шаг 6: Сложите все результаты',
                        text: `Сложим все полученные произведения:\n\\[${tensByTens} + ${tensByOnes} + ${onesByTens} + ${onesByOnes} = ${answer}\\]\n\nИтак, \\[${num1} \\times ${num2} = ${answer}\\]`
                    });
                }
                break;

            case 'division':
                hints.push({
                    title: 'Шаг 1: Проверьте делимость',
                    text: `Проверим, делится ли ${num1} на ${num2}:\n\\[\\frac{${num1}}{${num2}} = ?\\]`
                });
                hints.push({
                    title: 'Шаг 2: Вспомните таблицу умножения',
                    text: `Найдем число, которое при умножении на ${num2} даст ${num1}:\n\\[${num2} \\times ${answer} = ${num1}\\]`
                });
                if (num1 > 100 || num2 > 10) {
                    const factors1 = getPrimeFactors(num1);
                    const factors2 = getPrimeFactors(num2);
                    hints.push({
                        title: 'Шаг 3: Разбейте на простые множители',
                        text: `Разложим числа на простые множители:\n\\[${num1} = ${factors1.join(' \\times ')}\\]\n\\[${num2} = ${factors2.join(' \\times ')}\\]
                        \nСократим общие множители и получим ответ: ${answer}`
                    });
                }
                break;
        }
    }

    return hints;
}

// Функция для разложения числа на простые множители
function getPrimeFactors(num) {
    const factors = [];
    let divisor = 2;
    
    while (num > 1) {
        while (num % divisor === 0) {
            factors.push(divisor);
            num /= divisor;
        }
        divisor++;
    }
    
    return factors;
}

// Показ подсказок
function showHints(operation, num1, num2, answer) {
    if (!elements.supportMode.checked) {
        elements.hints.classList.remove('active');
        return;
    }

    const hints = generateHints(operation, num1, num2, answer);
    if (hints.length === 0) {
        elements.hints.classList.remove('active');
        return;
    }

    elements.hints.innerHTML = hints.map(hint => `
        <div class="hint-step">
            <h4>${hint.title}</h4>
            <div>${hint.text}</div>
        </div>
    `).join('');

    elements.hints.classList.add('active');

    // Перерисовываем математические формулы
    if (window.MathJax) {
        MathJax.typesetPromise([elements.hints]).catch(function (err) {
            console.log('MathJax error: ' + err.message);
        });
    }
}

// Генерация математической задачи
function generateProblem() {
    if (gameState.operation === 'life') {
        const problem = generateLifeProblem();
        // Сохраняем текущую задачу в gameState перед показом подсказок
        gameState.currentProblem = problem;
        showHints('life', null, null, problem.answer);
        return problem;
    }

    const range = difficultyRanges[gameState.difficulty];
    let num1, num2, operation, answer;

    if (gameState.operation === 'mixed') {
        const operations = ['addition', 'subtraction', 'multiplication', 'division'];
        operation = operations[Math.floor(Math.random() * operations.length)];
    } else {
        operation = gameState.operation;
    }

    switch (operation) {
        case 'addition':
            num1 = getRandomNumber(range.min, range.max);
            num2 = getRandomNumber(range.min, range.max);
            answer = num1 + num2;
            showHints(operation, num1, num2, answer);
            return {
                text: `\\[${num1} + ${num2} = ?\\]`,
                answer: answer,
                options: generateAnswerOptions(answer, range)
            };

        case 'subtraction':
            num1 = getRandomNumber(range.min, range.max);
            num2 = getRandomNumber(range.min, num1);
            answer = num1 - num2;
            showHints(operation, num1, num2, answer);
            return {
                text: `\\[${num1} - ${num2} = ?\\]`,
                answer: answer,
                options: generateAnswerOptions(answer, range)
            };

        case 'multiplication':
            num1 = getRandomNumber(range.min, range.max);
            num2 = getRandomNumber(range.min, range.max);
            answer = num1 * num2;
            showHints(operation, num1, num2, answer);
            return {
                text: `\\[${num1} \\times ${num2} = ?\\]`,
                answer: answer,
                options: generateAnswerOptions(answer, range)
            };

        case 'division':
            num2 = getRandomNumber(range.min, range.max);
            answer = getRandomNumber(range.min, range.max);
            num1 = num2 * answer;
            showHints(operation, num1, num2, answer);
            return {
                text: `\\[\\frac{${num1}}{${num2}} = ?\\]`,
                answer: answer,
                options: generateAnswerOptions(answer, range)
            };
    }
}

// Генерация жизненной задачи
function generateLifeProblem() {
    const numProducts = Math.floor(Math.random() * 3) + 2; // 2-4 продукта
    const selectedProducts = [];
    let totalCost = 0;
    let problemText = '<div class="life-problem">';
    problemText += '<div class="life-problem-header">Список покупок:</div>';
    problemText += '<div class="life-problem-items">';

    for (let i = 0; i < numProducts; i++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 5) + 1;
        const cost = product.price * quantity;
        totalCost += cost;

        problemText += `
            <div class="life-problem-item">
                <span class="quantity">${quantity}</span>
                <span class="unit">${product.unit}</span>
                <span class="name">${product.name}</span>
                <span class="price">${product.price} м.</span>
            </div>
        `;

        selectedProducts.push({ product, quantity, cost });
    }

    problemText += '</div>';
    problemText += '<div class="life-problem-question">Сколько стоит вся покупка?</div>';
    problemText += '</div>';

    // Генерируем варианты ответов для жизненных задач
    const options = generateAnswerOptions(totalCost, difficultyRanges.life);

    return {
        text: problemText,
        answer: totalCost,
        products: selectedProducts,
        options: options // Добавляем варианты ответов
    };
}

// Генерация вариантов ответов
function generateAnswerOptions(correctAnswer, range) {
    const options = [correctAnswer];
    const maxAttempts = 100;
    let attempts = 0;

    while (options.length < 4 && attempts < maxAttempts) {
        let wrongAnswer;
        if (gameState.operation === 'division') {
            wrongAnswer = getRandomNumber(range.min, range.max);
        } else {
            // Генерируем неправильный ответ в пределах ±20% от правильного
            const deviation = Math.max(1, Math.floor(correctAnswer * 0.2));
            wrongAnswer = correctAnswer + getRandomNumber(-deviation, deviation);
        }

        // Проверяем, что ответ не выходит за пределы диапазона и не повторяется
        if (wrongAnswer >= range.min && 
            wrongAnswer <= range.max && 
            !options.includes(wrongAnswer)) {
            options.push(wrongAnswer);
        }
        attempts++;
    }

    // Если не удалось сгенерировать достаточно уникальных ответов,
    // добавляем случайные числа из диапазона
    while (options.length < 4) {
        const randomAnswer = getRandomNumber(range.min, range.max);
        if (!options.includes(randomAnswer)) {
            options.push(randomAnswer);
        }
    }

    // Перемешиваем варианты ответов
    return options.sort(() => Math.random() - 0.5);
}

// Начало игры
function startGame() {
    if (!gameState.operation || !gameState.difficulty) {
        alert('Пожалуйста, выберите операцию и уровень сложности');
        return;
    }

    // Сброс состояния
    gameState.correctCount = 0;
    gameState.incorrectCount = 0;
    gameState.timeLeft = 120;
    gameState.streak = 0;
    gameState.bestStreak = 0;
    gameState.totalProblems = 0;
    gameState.startTime = Date.now();
    gameState.averageTime = 0;
    updateStats();

    // Показать игровой экран
    screens.mainMenu.classList.remove('active');
    screens.gameScreen.classList.add('active');
    screens.resultsScreen.classList.remove('active');

    // Запустить таймер
    gameState.timer = setInterval(updateTimer, 1000);

    // Сгенерировать первую задачу
    generateNewProblem();
}

// Обновление таймера
function updateTimer() {
    gameState.timeLeft--;
    elements.timeLeft.textContent = gameState.timeLeft;

    if (gameState.timeLeft <= 0) {
        endGame();
    }
}

// Генерация новой задачи
function generateNewProblem() {
    const problem = generateProblem();
    elements.problem.innerHTML = problem.text;
    
    // Обновляем варианты ответов
    elements.answerOptions.forEach((option, index) => {
        option.textContent = problem.options[index];
        option.className = 'answer-option';
        option.onclick = () => checkAnswer(problem.options[index]);
    });

    // Перерисовываем математические формулы
    if (window.MathJax) {
        MathJax.typesetPromise([elements.problem]).catch(function (err) {
            console.log('MathJax error: ' + err.message);
        });
    }
}

// Проверка ответа
function checkAnswer(selectedAnswer) {
    const isCorrect = selectedAnswer === gameState.currentProblem.answer;
    const currentTime = Date.now();
    const timeSpent = (currentTime - gameState.startTime) / 1000;
    gameState.totalProblems++;
    gameState.averageTime = ((gameState.averageTime * (gameState.totalProblems - 1)) + timeSpent) / gameState.totalProblems;
    gameState.startTime = currentTime;

    if (isCorrect) {
        gameState.correctCount++;
        gameState.streak++;
        if (gameState.streak > gameState.bestStreak) {
            gameState.bestStreak = gameState.streak;
        }
        elements.feedback.textContent = `Правильно! Серия: ${gameState.streak}`;
        elements.feedback.className = 'feedback correct';
        try {
            correctSound.play();
        } catch (e) {
            console.warn('Ошибка воспроизведения звука:', e);
        }
        
        // Подсвечиваем правильный ответ
        elements.answerOptions.forEach(option => {
            if (parseInt(option.textContent) === gameState.currentProblem.answer) {
                option.classList.add('correct');
            }
        });
    } else {
        gameState.incorrectCount++;
        gameState.streak = 0;
        elements.feedback.textContent = `Неправильно! Правильный ответ: ${gameState.currentProblem.answer}`;
        elements.feedback.className = 'feedback incorrect';
        try {
            incorrectSound.play();
        } catch (e) {
            console.warn('Ошибка воспроизведения звука:', e);
        }
        
        // Подсвечиваем правильный и неправильный ответы
        elements.answerOptions.forEach(option => {
            const value = parseInt(option.textContent);
            if (value === gameState.currentProblem.answer) {
                option.classList.add('correct');
            } else if (value === selectedAnswer) {
                option.classList.add('incorrect');
            }
        });
    }

    updateStats();
    
    // Задержка перед следующей задачей
    setTimeout(() => {
        elements.feedback.textContent = '';
        elements.feedback.className = 'feedback';
        generateNewProblem();
    }, 1500);
}

// Обновление статистики
function updateStats() {
    elements.correctCount.textContent = gameState.correctCount;
    elements.incorrectCount.textContent = gameState.incorrectCount;
    
    // Обновляем таймер с предупреждением
    if (gameState.timeLeft <= 30) {
        elements.timeLeft.parentElement.classList.add('warning');
    } else {
        elements.timeLeft.parentElement.classList.remove('warning');
    }
}

// Окончание игры
function endGame() {
    clearInterval(gameState.timer);
    
    // Обновить результаты
    elements.finalCorrect.textContent = gameState.correctCount;
    elements.finalIncorrect.textContent = gameState.incorrectCount;
    
    const total = gameState.correctCount + gameState.incorrectCount;
    const accuracy = total > 0 ? Math.round((gameState.correctCount / total) * 100) : 0;
    elements.accuracy.textContent = accuracy;

    // Добавляем дополнительную статистику
    const resultsContent = document.querySelector('.results-content');
    resultsContent.innerHTML = `
        <p>Правильных ответов: <span id="final-correct">${gameState.correctCount}</span></p>
        <p>Неправильных ответов: <span id="final-incorrect">${gameState.incorrectCount}</span></p>
        <p>Процент правильных ответов: <span id="accuracy">${accuracy}</span>%</p>
        <p>Лучшая серия правильных ответов: ${gameState.bestStreak}</p>
        <p>Среднее время на задачу: ${gameState.averageTime.toFixed(1)} сек</p>
        <p>Всего решено задач: ${gameState.totalProblems}</p>
    `;

    // Показать экран результатов
    screens.gameScreen.classList.remove('active');
    screens.resultsScreen.classList.add('active');

    // Добавляем функцию для сохранения результатов
    saveResults();
}

// Сброс игры
function resetGame() {
    screens.resultsScreen.classList.remove('active');
    screens.mainMenu.classList.add('active');
    
    // Сброс выбранных опций
    document.querySelectorAll('[data-operation]').forEach(btn => btn.classList.remove('selected'));
    document.querySelectorAll('[data-difficulty]').forEach(btn => btn.classList.remove('selected'));
    gameState.operation = null;
    gameState.difficulty = null;
    
    // Скрываем подсказки
    elements.hints.classList.remove('active');
}

// Добавляем функцию для сохранения результатов
function saveResults() {
    const results = {
        date: new Date().toLocaleString(),
        correct: gameState.correctCount,
        incorrect: gameState.incorrectCount,
        accuracy: Math.round((gameState.correctCount / (gameState.correctCount + gameState.incorrectCount)) * 100),
        totalProblems: gameState.totalProblems,
        bestStreak: gameState.bestStreak,
        averageTime: Math.round(gameState.averageTime)
    };

    let history = JSON.parse(localStorage.getItem('mathTrainerHistory') || '[]');
    history.unshift(results);
    history = history.slice(0, 10); // Храним только последние 10 результатов
    localStorage.setItem('mathTrainerHistory', JSON.stringify(history));
}

function showHistory() {
    const history = JSON.parse(localStorage.getItem('mathTrainerHistory') || '[]');
    elements.historyList.innerHTML = '';

    if (history.length === 0) {
        elements.historyList.innerHTML = '<p class="no-history">История результатов пуста</p>';
        return;
    }

    history.forEach(result => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-item-header">
                <span class="history-item-date">${result.date}</span>
                <span class="history-item-accuracy">Точность: ${result.accuracy}%</span>
            </div>
            <div class="history-item-stats">
                <div class="history-item-stat">
                    <span>${result.correct}</span>
                    <small>Правильных</small>
                </div>
                <div class="history-item-stat">
                    <span>${result.incorrect}</span>
                    <small>Неправильных</small>
                </div>
                <div class="history-item-stat">
                    <span>${result.totalProblems}</span>
                    <small>Всего задач</small>
                </div>
                <div class="history-item-stat">
                    <span>${result.bestStreak}</span>
                    <small>Лучшая серия</small>
                </div>
                <div class="history-item-stat">
                    <span>${result.averageTime}с</span>
                    <small>Среднее время</small>
                </div>
            </div>
        `;
        elements.historyList.appendChild(historyItem);
    });
}

// Добавляем обработчики событий
elements.showHistory.addEventListener('click', () => {
    document.getElementById('results-screen').style.display = 'none';
    document.getElementById('history-screen').style.display = 'block';
    showHistory();
});

elements.backToResults.addEventListener('click', () => {
    document.getElementById('history-screen').style.display = 'none';
    document.getElementById('results-screen').style.display = 'block';
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initGame); 