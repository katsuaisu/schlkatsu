
document.body.style.fontFamily = "'Simply Rounded', sans-serif";
document.body.style.fontWeight = "bold";


document.getElementById('tab-todo').onclick = () => {
  document.getElementById('todo-content').classList.remove('hidden');
  document.getElementById('gwa-content').classList.add('hidden');
  document.getElementById('transmute-content').classList.add('hidden');

  document.getElementById('tab-todo').classList.add('active');
  document.getElementById('tab-gwa').classList.remove('active');
  document.getElementById('tab-transmute').classList.remove('active');
};

document.getElementById('tab-gwa').onclick = () => {
  document.getElementById('todo-content').classList.add('hidden');
  document.getElementById('gwa-content').classList.remove('hidden');
  document.getElementById('transmute-content').classList.add('hidden');

  document.getElementById('tab-gwa').classList.add('active');
  document.getElementById('tab-todo').classList.remove('active');
  document.getElementById('tab-transmute').classList.remove('active');
};

document.getElementById('tab-transmute').onclick = () => {
  document.getElementById('todo-content').classList.add('hidden');
  document.getElementById('gwa-content').classList.add('hidden');
  document.getElementById('transmute-content').classList.remove('hidden');

  document.getElementById('tab-transmute').classList.add('active');
  document.getElementById('tab-todo').classList.remove('active');
  document.getElementById('tab-gwa').classList.remove('active');
};


const STATUS = ["Not Started", "In Progress", "Completed"];
const tasks = [];

const todoForm = document.getElementById("todo-form");
const todoBody = document.getElementById("todo-body");

todoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("assignment-name").value;
  const date = document.getElementById("due-date").value;
  tasks.push({ name, date, done: false, status: 0 });
  renderTasks();
  todoForm.reset();
});

function renderTasks() {
  todoBody.innerHTML = "";
  tasks.forEach((task, i) => {
    const row = document.createElement("tr");

    const checkCell = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.onchange = () => {
      task.done = checkbox.checked;
    };
    checkCell.appendChild(checkbox);
    row.appendChild(checkCell);

    const nameCell = document.createElement("td");
    nameCell.textContent = task.name;
    row.appendChild(nameCell);

    const statusCell = document.createElement("td");
    const statusBtn = document.createElement("button");
    statusBtn.className = "status-btn " + ["not-started", "in-progress", "completed"][task.status];
    statusBtn.textContent = STATUS[task.status];
    statusBtn.onclick = () => {
      task.status = (task.status + 1) % 3;
      renderTasks();
    };
    statusCell.appendChild(statusBtn);
    row.appendChild(statusCell);

    const dateCell = document.createElement("td");
    dateCell.textContent = task.date;
    row.appendChild(dateCell);

    todoBody.appendChild(row);
  });
}


const SUBJECTS = [
  "Biology", "Chemistry", "Physics", "Math", "Statistics",
  "Social Science", "English", "Filipino", "PEHM"
];

const EXACT_GRADES = [
  "1.00", "1.25", "1.50", "1.75", "2.00",
  "2.25", "2.50", "2.75", "3.00", "4.00", "5.00"
];

const gwaBody = document.getElementById("gwa-body");
const gwaDisplay = document.getElementById("gwa-display");
const grades = Array(SUBJECTS.length).fill("1.00");

function calculateGWA() {
  const total = grades.reduce((sum, g) => sum + parseFloat(g), 0);
  const avg = total / grades.length;
  gwaDisplay.textContent = "GWA: " + avg.toFixed(2);
}

function renderGrades() {
  gwaBody.innerHTML = "";
  SUBJECTS.forEach((subj, i) => {
    const row = document.createElement("tr");
    const subjCell = document.createElement("td");
    subjCell.textContent = subj;
    row.appendChild(subjCell);

    const gradeCell = document.createElement("td");
    const select = document.createElement("select");
    select.className = "grade-select";

    EXACT_GRADES.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.text = g;
      if (g === grades[i]) opt.selected = true;
      select.appendChild(opt);
    });

    select.onchange = () => {
      grades[i] = select.value;
      calculateGWA();
    };

    gradeCell.appendChild(select);
    row.appendChild(gradeCell);

    gwaBody.appendChild(row);
  });
  calculateGWA();
}

renderGrades();

const transmuteBody = document.getElementById("transmute-body");

function pisayTransmute(val) {
  const g = parseFloat(val);
  if (g <= 1.125) return "1.00";
  if (g <= 1.375) return "1.25";
  if (g <= 1.625) return "1.50";
  if (g <= 1.875) return "1.75";
  if (g <= 2.125) return "2.00";
  if (g <= 2.375) return "2.25";
  if (g <= 2.625) return "2.50";
  if (g <= 2.875) return "2.75";
  if (g <= 3.5) return "3.00";
  if (g <= 4.5) return "4.00";
  return "5.00";
}

function renderTransmutation() {
  transmuteBody.innerHTML = "";
  SUBJECTS.forEach((subj) => {
    const row = document.createElement("tr");

    const subjCell = document.createElement("td");
    subjCell.textContent = subj;
    row.appendChild(subjCell);

    const prevCell = document.createElement("td");
    const prevSelect = document.createElement("select");
    prevSelect.className = "grade-select";
    EXACT_GRADES.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.text = g;
      prevSelect.appendChild(opt);
    });
    prevCell.appendChild(prevSelect);
    row.appendChild(prevCell);

    const currCell = document.createElement("td");
    const currSelect = document.createElement("select");
    currSelect.className = "grade-select";
    EXACT_GRADES.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.text = g;
      currSelect.appendChild(opt);
    });
    currCell.appendChild(currSelect);
    row.appendChild(currCell);

    const resultCell = document.createElement("td");
    resultCell.className = "transmute-result";
    row.appendChild(resultCell);

    function updateResult() {
      const prevVal = parseFloat(prevSelect.value);
      const currVal = parseFloat(currSelect.value);
      if (!isNaN(prevVal) && !isNaN(currVal)) {
        const avg = (prevVal + currVal) / 2;
        resultCell.textContent = pisayTransmute(avg);
      } else {
        resultCell.textContent = "";
      }
    }

    prevSelect.addEventListener("change", updateResult);
    currSelect.addEventListener("change", updateResult);
    updateResult();

    transmuteBody.appendChild(row);
  });
}

renderTransmutation();
