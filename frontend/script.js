document.addEventListener("DOMContentLoaded", function () {
  const API_BASE = "http://127.0.0.1:8000";

  // Элементы основных разделов
  const authSection = document.getElementById("authSection");
  const genSection = document.getElementById("genSection");
  const listSection = document.getElementById("listSection");
  const viewSection = document.getElementById("viewPresentationSection");

  // Навигационные ссылки и индикатор статуса
  const authLink = document.getElementById("authLink");
  const genLink = document.getElementById("genLink");
  const listLink = document.getElementById("listLink");
  const userStatus = document.getElementById("userStatus");

  // Элементы формы регистрации
  const registerForm = document.getElementById("registerForm");
  const regUsername = document.getElementById("regUsername");
  const regPassword = document.getElementById("regPassword");
  const registerMsg = document.getElementById("registerMsg");

  // Элементы формы логина
  const loginForm = document.getElementById("loginForm");
  const loginUsername = document.getElementById("loginUsername");
  const loginPassword = document.getElementById("loginPassword");
  const loginMsg = document.getElementById("loginMsg");

  // Элементы формы создания презентации
  const presentationForm = document.getElementById("presentationForm");
  const presentationTheme = document.getElementById("presentationTheme");
  const presentationPages = document.getElementById("presentationPages");
  const presentationMsg = document.getElementById("presentationMsg");

  // Контейнер для списка презентаций
  const presentationsList = document.getElementById("presentationsList");

  // Элементы для просмотра презентации (слайды)
  const slideTitle = document.getElementById("slideTitle");
  const slideContent = document.getElementById("slideContent");
  const prevSlideButton = document.getElementById("prevSlide");
  const nextSlideButton = document.getElementById("nextSlide");
  const editSlideButton = document.getElementById("editSlide"); // новая кнопка редактирования слайда
  const closeViewButton = document.getElementById("closePresentationView");

  // Функции работы с токеном (LocalStorage)
  function setToken(token) {
    localStorage.setItem("token", token);
  }
  function getToken() {
    return localStorage.getItem("token");
  }
  function removeToken() {
    localStorage.removeItem("token");
  }

  // Глобальные переменные для просмотра презентации
  let slides = [];
  let currentSlideIndex = 0;
  // Храним ID текущей презентации, если потребуется обновление на сервере
  let currentPresentationId = null;

  // Переключение между разделами
  authLink.addEventListener("click", () => {
    authSection.classList.remove("hidden");
    genSection.classList.add("hidden");
    listSection.classList.add("hidden");
    viewSection.classList.add("hidden");
  });
  genLink.addEventListener("click", () => {
    if (!getToken()) {
      alert("Для создания презентации необходимо войти или зарегистрироваться!");
      return;
    }
    authSection.classList.add("hidden");
    genSection.classList.remove("hidden");
    listSection.classList.add("hidden");
    viewSection.classList.add("hidden");
  });
  listLink.addEventListener("click", () => {
    if (!getToken()) {
      alert("Для просмотра презентаций необходимо войти или зарегистрироваться!");
      return;
    }
    authSection.classList.add("hidden");
    genSection.classList.add("hidden");
    listSection.classList.remove("hidden");
    viewSection.classList.add("hidden");
    fetchUserPresentations();
  });

  // Функция обновления статуса пользователя
  async function updateUserStatus() {
    const token = getToken();
    if (!token) {
      userStatus.textContent = "Вы не вошли";
      return;
    }
    try {
      const res = await fetch(API_BASE + "/users/me", {
        headers: { "Authorization": "Bearer " + token },
      });
      if (res.ok) {
        const data = await res.json();
        userStatus.textContent = `Вы вошли как ${data.username}`;
      } else {
        userStatus.textContent = "Вы не вошли";
      }
    } catch (err) {
      console.error(err);
      userStatus.textContent = "Ошибка получения данных пользователя";
    }
  }

  // Обработка формы регистрации
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    registerMsg.textContent = "";
    const body = {
      username: regUsername.value,
      password: regPassword.value,
    };
    try {
      const res = await fetch(API_BASE + "/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.access_token) {
        registerMsg.textContent = "Регистрация успешна!";
        setToken(data.access_token);
        updateUserStatus();
      } else {
        registerMsg.textContent = data.detail || "Ошибка регистрации";
        registerMsg.classList.add("error");
      }
    } catch (err) {
      console.error(err);
      registerMsg.textContent = "Ошибка соединения";
      registerMsg.classList.add("error");
    }
  });

  // Обработка формы входа
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginMsg.textContent = "";
    const params = new URLSearchParams();
    params.append("username", loginUsername.value);
    params.append("password", loginPassword.value);
    try {
      const res = await fetch(API_BASE + "/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      const data = await res.json();
      if (res.ok && data.access_token) {
        loginMsg.textContent = "Вход успешен!";
        setToken(data.access_token);
        updateUserStatus();
      } else {
        loginMsg.textContent = data.detail || "Ошибка входа";
        loginMsg.classList.add("error");
      }
    } catch (err) {
      console.error(err);
      loginMsg.textContent = "Ошибка соединения";
      loginMsg.classList.add("error");
    }
  });

  // Обработка формы создания презентации
  presentationForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    presentationMsg.textContent = "";
    const token = getToken();
    if (!token) {
      presentationMsg.textContent = "Сначала выполните вход!";
      presentationMsg.classList.add("error");
      return;
    }
    const body = {
      theme: presentationTheme.value,
      num_pages: parseInt(presentationPages.value),
      settings: { layout: "Modern", colorScheme: "dark" },
    };
    try {
      const res = await fetch(API_BASE + "/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        presentationMsg.textContent = "Презентация создана с ID: " + data.id;
        // После создания автоматически открываем режим просмотра
        viewPresentation(data.id);
      } else {
        presentationMsg.textContent =
          data.detail || "Ошибка создания презентации";
        presentationMsg.classList.add("error");
      }
    } catch (err) {
      console.error(err);
      presentationMsg.textContent = "Ошибка соединения";
      presentationMsg.classList.add("error");
    }
  });

  // Функция получения списка презентаций текущего пользователя
  async function fetchUserPresentations() {
    const token = getToken();
    if (!token) {
      alert("Для просмотра презентаций необходимо войти!");
      return;
    }
    try {
      const res = await fetch(API_BASE + "/presentations", {
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token,
        },
      });
      if (res.ok) {
        const data = await res.json();
        presentationsList.innerHTML = "";
        data.forEach((presentation) => {
          const row = document.createElement("tr");

          // ID презентации
          const cellId = document.createElement("td");
          cellId.textContent = presentation.id;
          row.appendChild(cellId);

          // Тема презентации
          const cellTheme = document.createElement("td");
          cellTheme.textContent = presentation.theme;
          row.appendChild(cellTheme);

          // Количество слайдов
          const cellPages = document.createElement("td");
          cellPages.textContent = presentation.num_pages || "-";
          row.appendChild(cellPages);

          // Действия: редактировать, скачивать, удалять, просматривать
          const cellActions = document.createElement("td");

          // Кнопка редактирования презентации (изменение темы)
          const editBtn = document.createElement("button");
          editBtn.textContent = "Редактировать";
          editBtn.addEventListener("click", () => {
            editPresentation(presentation.id, presentation.theme);
          });
          cellActions.appendChild(editBtn);

          // Кнопка скачивания PDF
          const pdfBtn = document.createElement("button");
          pdfBtn.textContent = "Скачать PDF";
          pdfBtn.addEventListener("click", () => {
            downloadPDF(presentation.id);
          });
          cellActions.appendChild(pdfBtn);

          // Кнопка скачивания PPTX
          const pptxBtn = document.createElement("button");
          pptxBtn.textContent = "Скачать PPTX";
          pptxBtn.addEventListener("click", () => {
            downloadPPTX(presentation.id);
          });
          cellActions.appendChild(pptxBtn);

          // Кнопка удаления презентации
          const deleteBtn = document.createElement("button");
          deleteBtn.textContent = "Удалить";
          deleteBtn.style.backgroundColor = "red";
          deleteBtn.addEventListener("click", () => {
            deletePresentation(presentation.id);
          });
          cellActions.appendChild(deleteBtn);

          // Кнопка просмотра презентации
          const viewBtn = document.createElement("button");
          viewBtn.textContent = "Посмотреть";
          viewBtn.addEventListener("click", () => {
            viewPresentation(presentation.id);
          });
          cellActions.appendChild(viewBtn);

          row.appendChild(cellActions);
          presentationsList.appendChild(row);
        });
      } else {
        presentationsList.innerHTML =
          "<tr><td colspan='5'>Ошибка получения презентаций</td></tr>";
      }
    } catch (err) {
      console.error("Ошибка при получении презентаций:", err);
      presentationsList.innerHTML =
        "<tr><td colspan='5'>Ошибка соединения с сервером</td></tr>";
    }
  }

  // Функция редактирования презентации (изменение темы)
  async function editPresentation(presentationId, currentTheme) {
    const newTheme = prompt("Введите новую тему", currentTheme);
    if (!newTheme) return;
    const token = getToken();
    try {
      const res = await fetch(API_BASE + "/presentation/" + presentationId, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token,
        },
        body: JSON.stringify({ theme: newTheme }),
      });
      if (res.ok) {
        alert("Презентация обновлена!");
        fetchUserPresentations();
      } else {
        const data = await res.json();
        alert("Ошибка: " + (data.detail || "Не удалось обновить презентацию"));
      }
    } catch (err) {
      console.error(err);
      alert("Ошибка соединения");
    }
  }

  // Функция удаления презентации
  async function deletePresentation(presentationId) {
    const token = getToken();
    if (!token) {
      alert("Сначала выполните вход!");
      return;
    }
    if (!confirm("Вы уверены, что хотите удалить презентацию?")) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/presentation/${presentationId}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + token },
      });
      if (res.ok) {
        alert("Презентация успешно удалена!");
        fetchUserPresentations();
      } else {
        const data = await res.json();
        alert("Ошибка удаления: " + (data.detail || "Не удалось удалить презентацию"));
      }
    } catch (err) {
      console.error(err);
      alert("Ошибка соединения");
    }
  }

  // Функция скачивания PDF
  async function downloadPDF(presentationId) {
    const token = getToken();
    if (!token) {
      alert("Сначала выполните вход!");
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/export/pdf/${presentationId}`, {
        method: "GET",
        headers: { "Authorization": "Bearer " + token },
      });
      if (!response.ok) {
        throw new Error("Ошибка загрузки файла");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `presentation_${presentationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Ошибка при скачивании PDF:", err);
      alert("Ошибка при скачивании PDF");
    }
  }

  // Функция скачивания PPTX
  async function downloadPPTX(presentationId) {
    const token = getToken();
    if (!token) {
      alert("Сначала выполните вход!");
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/export/pptx/${presentationId}`, {
        method: "GET",
        headers: { "Authorization": "Bearer " + token },
      });
      if (!response.ok) {
        throw new Error("Ошибка загрузки файла");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `presentation_${presentationId}.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Ошибка при скачивании PPTX:", err);
      alert("Ошибка при скачивании PPTX");
    }
  }

  // Функция просмотра презентации и загрузки слайдов
  async function viewPresentation(presentationId) {
    const token = getToken();
    if (!token) {
      alert("Сначала выполните вход!");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/presentation/${presentationId}`, {
        headers: { "Authorization": "Bearer " + token },
      });
      if (!res.ok) {
        throw new Error("Ошибка загрузки презентации");
      }
      const data = await res.json();
      slides = data.slides || [];
      currentSlideIndex = 0;
      currentPresentationId = presentationId;
      showSlide(currentSlideIndex);
      // Переключаем вид
      authSection.classList.add("hidden");
      genSection.classList.add("hidden");
      listSection.classList.add("hidden");
      viewSection.classList.remove("hidden");
    } catch (err) {
      console.error("Ошибка при просмотре презентации:", err);
      alert("Ошибка при загрузке презентации");
    }
  }

  // Функция отображения текущего слайда
  function showSlide(index) {
    if (slides.length === 0) return;
    currentSlideIndex = Math.max(0, Math.min(index, slides.length - 1));
    slideTitle.textContent = slides[currentSlideIndex].title;
    slideContent.innerHTML = slides[currentSlideIndex].content.join("<br>");
  }

  // Обработчики кнопок переключения слайдов
  prevSlideButton.addEventListener("click", () => showSlide(currentSlideIndex - 1));
  nextSlideButton.addEventListener("click", () => showSlide(currentSlideIndex + 1));

  // Обработчик кнопки закрытия просмотра презентации
  closeViewButton.addEventListener("click", () => {
    viewSection.classList.add("hidden");
    listSection.classList.remove("hidden");
    fetchUserPresentations();
  });

  // Обработчик кнопки редактирования текущего слайда
  editSlideButton.addEventListener("click", () => {
    if (slides.length === 0) return;
    const currentSlide = slides[currentSlideIndex];
    
    // Предлагаем пользователю ввести новый заголовок (или оставить прежний)
    const newTitle = prompt("Введите новый заголовок слайда:", currentSlide.title);
    if (newTitle === null) return; // отмена
    
    // Предлагаем пользователю ввести новый контент слайда (разделённый символом ;)
    const currentContentStr = currentSlide.content.join("; ");
    const newContentStr = prompt("Введите новый контент слайда (разделяйте строки символом ';'):", currentContentStr);
    if (newContentStr === null) return;
    
    // Разбиваем введённую строку в массив, удаляя лишние пробелы
    const newContent = newContentStr.split(";").map(s => s.trim()).filter(s => s.length > 0);
    
    // Обновляем данные текущего слайда
    slides[currentSlideIndex].title = newTitle;
    slides[currentSlideIndex].content = newContent;
    
    // Обновляем отображение слайда
    showSlide(currentSlideIndex);
    
    // Опционально: можно сохранить изменения на сервере, отправив обновлённый slides JSON
    // Например, вызовом PUT-запроса на /presentation/{presentationId} с полем slides: slides
    // Для простоты данный код оставлен только для локального обновления.
  });

  // При загрузке страницы обновляем статус пользователя
  if (getToken()) {
    updateUserStatus();
  } else {
    userStatus.textContent = "Вы не вошли";
  }
});