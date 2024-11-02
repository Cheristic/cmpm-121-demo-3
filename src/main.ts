const app = document.getElementById("app") as HTMLElement;

const button = document.createElement("button");
button.innerHTML = "COOL TEST";
button.addEventListener("click", () => {
  alert(`wow you're pretty cool`);
});
app.append(button);
