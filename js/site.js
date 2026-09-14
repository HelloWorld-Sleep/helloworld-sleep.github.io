// ===== 明暗主题：首次跟随系统，之后记住用户选择 =====
const root = document.documentElement;

const saved = localStorage.getItem("theme");
if (saved) {
  root.setAttribute("data-theme", saved);
} else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  root.setAttribute("data-theme", "dark");
}

const themeToggle = document.querySelector(".theme-toggle");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next); // 记住偏好，下次打开仍是这个
  });
}

// ===== 移动端汉堡菜单：点 ☰ 展开/收起链接（仅当元素存在时绑定）=====
const navToggle = document.querySelector(".nav-toggle");
if (navToggle) {
  navToggle.addEventListener("click", () => {
    const links = document.querySelector(".nav-links");
    if (links) links.classList.toggle("open");
  });
}

// ===== 页脚年份（仅首页有 #year 元素）=====
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
