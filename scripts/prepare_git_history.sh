#!/usr/bin/env sh
set -eu
if [ -d .git ]; then
  echo 'У цьому каталозі вже існує .git. Історію не змінено.'
  exit 1
fi
if [ ! -f index.html ] || [ ! -f src/solver.js ]; then
  echo 'Запустіть скрипт у корені проєкту LR3_ODE_Boioh_Serhii.'
  exit 1
fi
git init
git branch -M main
git add package.json package-lock.json index.html README.md
 git commit -m '[AI] define ODE requirements and web entry'
git add src/solver.js src/expression.js
 git commit -m '[AI] implement Strategy Euler Heun RK4 and safe formulas'
git add src/chart.js src/style.css
 git commit -m '[AI] implement responsive SVG plots and automatic scaling'
git add src/app.js index_offline.html
 git commit -m '[AI] add step animations, input and CSV JSON actions'
git add tests/ .github/workflows/tests.yml
 git commit -m '[AI] add unit tests and GitHub Actions CI'
git add scripts/ docs/
 git commit -m '[AI] add benchmarks diagrams and documentation'
echo 'Коміти створено. Виконайте git log --oneline і перевірте вміст, після чого прив’яжіть GitHub.'
