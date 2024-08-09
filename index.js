/** @type {HTMLCanvasElement} */
// Get the canvas element
const canvas = document.getElementById('Canvas');
const ctx = canvas.getContext('2d');

// Array to store rectangles
let rectangles = [];

// Rectangle size
const rectSize = 20;

// Function to draw all rectangles
function drawRectangles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    rectangles.forEach(rect => {
        ctx.fillStyle = 'blue';
        ctx.fillRect(rect.x - rectSize / 2, rect.y - rectSize / 2, rectSize, rectSize);
    });
}

// Function to add a rectangle
function addRectangle(x, y) {
    rectangles.push({ x, y });
    drawRectangles();
}

// Function to remove a rectangle
function removeRectangle(x, y) {
    rectangles = rectangles.filter(rect =>
        !(x >= rect.x - rectSize / 2 && x <= rect.x + rectSize / 2 &&
            y >= rect.y - rectSize / 2 && y <= rect.y + rectSize / 2)
    );
    drawRectangles();
}

// Left click event listener
canvas.addEventListener('click', function(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    addRectangle(x, y);
});

// Right click event listener
canvas.addEventListener('contextmenu', function(e) {
    e.preventDefault(); // Prevent the default context menu
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    removeRectangle(x, y);
});

// Initial draw
drawRectangles();
