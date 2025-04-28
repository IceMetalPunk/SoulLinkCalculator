import TYPES from './types.js';

const $ = (...els) => {
  return els.map((query) => {
    const res = [...document.querySelectorAll(query)];
    return res.length === 1 ? res[0] : res;
  });
};
const [
  inputP1,
  inputP2,
  inputT1,
  inputT2,
  inputLoc,
  addBtn,
  display,
  teamList,
  calculatingMsg,
] = $(
  '#pokemon1',
  '#pokemon2',
  '#type1',
  '#type2',
  '#location',
  '#addBtn',
  '#display',
  '#teamList',
  '.calculating'
);
const [saveBtn, loadBtn] = $('#save', '#load');

[inputT1, inputT2].forEach((input) => {
  TYPES.forEach((type) => {
    input.add(new Option(type, type));
  });
});

const worker = new Worker('./worker.js', { type: 'module' });

let teams = [];
let caught = [];
let required = [];

const render = () => {
  teamList.innerHTML = '';
  if (caught.length > 0) {
    document.querySelector('.caught-header').classList.remove('hidden');
  } else {
    document.querySelector('.caught-header').classList.add('hidden');
  }
  caught.forEach((pair) => {
    const adding = document.createElement('li');
    adding.innerHTML = `<strong>${pair.p1}</strong> and<br><strong>${pair.p2}</strong>`;
    const removeBtn = document.createElement('a');
    removeBtn.classList.add('remove-btn');
    removeBtn.innerHTML = '×';
    adding.appendChild(removeBtn);

    const requireBtn = document.createElement('a');
    requireBtn.classList.add('require-btn');
    requireBtn.innerHTML = '✓';
    adding.appendChild(requireBtn);

    adding.innerHTML += `<br><em>${pair.location}</em>`;
    adding.querySelector('.remove-btn').addEventListener('click', () => {
      removePair(pair);
    });
    const btn = adding.querySelector('.require-btn');
    const found = required.findIndex((req) => {
      return (
        (req.p1 === pair.p1 && req.p2 === pair.p2) ||
        (req.p2 === pair.p1 &&
          req.p1 === pair.p2 &&
          req.location === pair.location)
      );
    });
    if (found >= 0) {
      btn.classList.add('checked');
    }
    btn.addEventListener('click', () => {
      const found = required.findIndex((req) => {
        return (
          (req.p1 === pair.p1 && req.p2 === pair.p2) ||
          (req.p2 === pair.p1 &&
            req.p1 === pair.p2 &&
            req.location === pair.location)
        );
      });
      if (found >= 0) {
        required.splice(found, 1);
        btn.classList.remove('checked');
        window.localStorage.setItem('lastList', getSaveJson());
        render();
      } else {
        required.push(pair);
        btn.classList.add('checked');
        window.localStorage.setItem('lastList', getSaveJson());
        render();
      }
    });
    teamList.appendChild(adding);
  });

  display.innerHTML = '';
  if (isCalculating) {
    calculatingMsg.classList.remove('hidden');
  } else {
    calculatingMsg.classList.add('hidden');
  }
  for (let i = teams.length - 1; i >= 0; --i) {
    const valid = teams[i].filter((team) => {
      return required.every((req) => {
        return team.some((existing) => {
          return (
            (existing.p1 === req.p1 && existing.p2 === req.p2) ||
            (existing.p2 === req.p1 &&
              existing.p1 === req.p2 &&
              existing.location === req.location)
          );
        });
      });
    });
    if (Array.isArray(valid) && valid.length > 0) {
      let content = `<div class='teams closed'><h3>Teams With ${
        i + 1
      } Pairs <em>(${valid.length} total)</em></h3>`;
      for (let team of valid) {
        content += '<ul>';
        for (let pair of team) {
          content += `<li><strong>${pair.p1}</strong> and <strong>${pair.p2}</strong> <em>(${pair.location})</em></li>`;
        }
        content += '</ul>';
      }
      content += '</div>';
      display.innerHTML += content;
    }
  }
  [...display.querySelectorAll('.teams')].forEach((div) => {
    const header = div.querySelector('h3');
    header.addEventListener('click', () => div.classList.toggle('closed'));
  });
};
const getSaveJson = () => JSON.stringify({ caught, teams, required }, null, 2);
const copyToJson = async () => {
  try {
    await navigator.clipboard.writeText(getSaveJson());
    Swal.fire({
      title: 'Data copied to your clipboard!',
      toast: true,
      background: '#40a258',
      position: 'top-end',
      showClass: {
        popup: 'slideIn',
      },
      hideClass: {
        popup: 'slideOut',
      },
      showConfirmButton: false,
      customClass: {
        popup: 'popup toast',
        container: 'container toast',
      },
      timer: 2000,
      timerProgressBar: true,
    });
  } catch (e) {
    Swal.fire({
      title: 'Copy the data below.',
      text: 'It contains all your team info.',
      input: 'textarea',
      inputValue: getSaveJson(),
      customClass: {
        input: 'small-text-area',
        popup: 'popup',
        confirmButton: 'popup-button',
      },
    });
  }
};
saveBtn.addEventListener('click', copyToJson);

const delay = (n) => new Promise((res) => setTimeout(res, n));
const loadFromJson = async (json) => {
  let json_parsed = null;
  if (!json) {
    try {
      json = await navigator.clipboard.readText();
      json_parsed = JSON.parse(json);
    } catch {
      await delay(50);
      const { value } = await Swal.fire({
        title: 'Paste the saved team data below:',
        input: 'textarea',
        customClass: {
          input: 'small-text-area',
          popup: 'popup',
          confirmButton: 'popup-button',
        },
      });
      json = value;
    }
  }

  try {
    json_parsed = JSON.parse(json);
    window.localStorage.setItem('lastList', json);
    teams = json_parsed.teams ?? [];
    caught = json_parsed.caught ?? [];
    required = json_parsed.required ?? [];
    worker.postMessage({
      type: 'load',
      caught,
    });
    inputP1.scrollIntoView();
    render();
    Swal.fire({
      title: 'Data loaded!',
      toast: true,
      background: '#40a258',
      position: 'top-end',
      showClass: {
        popup: 'slideIn',
      },
      hideClass: {
        popup: 'slideOut',
      },
      showConfirmButton: false,
      customClass: {
        popup: 'popup toast',
        container: 'container toast',
      },
      timer: 2000,
      timerProgressBar: true,
    });
  } catch (e) {
    console.log(e);
    Swal.fire({
      title: 'Data failed to load!',
      toast: true,
      background: '#f04258',
      position: 'top-end',
      showClass: {
        popup: 'slideIn',
      },
      hideClass: {
        popup: 'slideOut',
      },
      showConfirmButton: false,
      customClass: {
        popup: 'popup toast',
        container: 'container toast',
      },
      timer: 2000,
      timerProgressBar: true,
    });
  }
};
loadBtn.addEventListener('click', () => loadFromJson());

let isCalculating = false;
const addPair = () => {
  const pair = {
    p1: inputP1.value,
    p2: inputP2.value,
    t1: inputT1.value,
    t2: inputT2.value,
    location: inputLoc.value,
  };
  teams = [];
  caught.push(pair);
  isCalculating = true;
  render();
  worker.postMessage({
    type: 'add',
    pair,
  });

  [inputP1, inputP2, inputLoc].forEach((el) => (el.value = ''));
  [inputT1, inputT2].forEach((el) => (el.selectedIndex = 0));
  inputP1.focus();
};
[inputP1, inputP2, inputLoc].forEach((el) =>
  el.addEventListener('keypress', (ev) => {
    if (ev.key === 'Enter' || ev.key === 'Return') {
      ev.preventDefault();
      addPair();
      return false;
    }
  })
);
const removePair = ({ p1, p2, t1, t2, location }) => {
  teams = [];
  caught = caught.filter((team) => {
    return team.p1 !== p1 || team.p2 !== p2 || team.location !== location;
  });
  required = required.filter((team) => {
    return team.p1 !== p1 || team.p2 !== p2 || team.location !== location;
  });
  isCalculating = true;
  render();
  worker.postMessage({
    type: 'remove',
    pair: { p1, p2, t1, t2, location },
  });
};
worker.addEventListener('message', ({ data }) => {
  if (data.type === 'team') {
    const team = teams[data.team.length - 1] ?? [];
    const alreadyExists = team.some((existing) => {
      return existing.every((existingPair) => {
        return data.team.some((check) => {
          return (
            ((existingPair.p1 === check.p1 && existingPair.p2 === check.p2) ||
              (existingPair.p2 === check.p1 && existingPair.p1 === check.p2)) &&
            existingPair.location === check.location
          );
        });
      });
    });
    if (!alreadyExists) {
      team.push(data.team);
      teams[data.team.length - 1] = team;
      render();
    }
  } else if (data.type === 'complete') {
    isCalculating = false;
    window.localStorage.setItem('lastList', getSaveJson());
    render();
  }
});

addBtn.addEventListener('click', () => {
  if (inputP1 && inputP2 && inputLoc) {
    addPair();
  }
});

window.addEventListener('load', () => {
  const existing = window.localStorage.getItem('lastList');
  if (existing) {
    loadFromJson(existing);
  }
});
