const geese = document.querySelectorAll('.goose');
const questionText = document.querySelector('#question-text');
const hint = document.querySelector('#hint');
const answers = document.querySelector('#answers');
const pause = document.querySelector('#pause');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function animate(name) {
  if (document.body.classList.contains('paused') || reducedMotion.matches) return;
  geese.forEach(goose => {
    goose.classList.remove('idle', 'blink', 'wave');
    void goose.offsetWidth;
    goose.classList.add(name);
  });
}

function askQuestion() {
  questionText.textContent = 'Are customers unable to load recommendations?';
  hint.textContent = 'Your answer adds context to the investigation.';
  answers.hidden = false;
  animate('wave');
}

function answerQuestion(event) {
  questionText.textContent = 'Thanks. I’ve got your context.';
  hint.textContent = event.target.dataset.answer === 'yes'
    ? 'Preview answer: customers cannot load recommendations.'
    : 'Preview answer: customer impact is not yet known.';
  answers.hidden = true;
}

function togglePause() {
  const paused = document.body.classList.toggle('paused');
  pause.setAttribute('aria-pressed', String(paused));
  pause.textContent = paused ? 'Resume motion' : 'Pause motion';
}

geese.forEach(goose => goose.addEventListener('animationend', () => {
  goose.classList.remove('blink', 'wave');
  goose.classList.add('idle');
}));
document.querySelector('#blink').addEventListener('click', () => animate('blink'));
document.querySelector('#question').addEventListener('click', askQuestion);
pause.addEventListener('click', togglePause);
document.querySelectorAll('[data-answer]').forEach(button => {
  button.addEventListener('click', answerQuestion);
});
