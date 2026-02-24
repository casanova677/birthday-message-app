
addEventListener('DOMContentLoaded', () => {
  const socket = io();
  const messagesDiv = document.getElementById('messages');
  let allMessages = Array.from(messagesDiv.children);

  const BATCH_SIZE = 1;
  const INTERVAL = 15000;
  let index = 0;

  function showBatch() {
    messagesDiv.innerHTML = '';
    const batch = allMessages.slice(index, index + BATCH_SIZE);
    batch.forEach(el => messagesDiv.appendChild(el));
    index += BATCH_SIZE;
    if (index >= allMessages.length) index = 0;
  }

  showBatch();
  setInterval(showBatch, INTERVAL);

  socket.on('newMessage', msg => {
    const card = document.createElement('div');
    card.className =
      "fade-up bg-white/20 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/30";

    card.innerHTML = `
      <div class="grid grid-cols-[1fr_auto] gap-6 items-start">
        <p class="text-lg font-medium text-gray-800">${msg.message}</p>
        ${msg.picture ? `<img src="${msg.picture}" data-enlarge class="w-28 h-28 object-cover rounded-xl shadow-md cursor-pointer" />` : ``}
      </div>
      <div class="mt-4 text-sm text-gray-600 opacity-80 text-right">
        ${new Date(msg.createdAt).toLocaleString()}
      </div>
    `;

    

    async function refreshMessages() {
        const res = await fetch('/messages/latest');
        const data = await res.json();

        allMessages = data.map(msg => {
          const card = document.createElement('div');
          card.className =
            "fade-up bg-white/20 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/30";

          card.innerHTML = `
            <div class="grid grid-cols-[1fr_auto] gap-6 items-start">
              <p class="text-lg font-medium text-gray-800">${msg.message}</p>
              ${msg.picture ? `<img src="${msg.picture}" data-enlarge class="w-28 h-28 object-cover rounded-xl shadow-md cursor-pointer" />` : ``}
            </div>
            <div class="mt-4 text-sm text-gray-600 opacity-80 text-right">
              ${new Date(msg.createdAt).toLocaleString()}
            </div>
          `;
          return card;
        });
        showBatch();
      }

      setInterval(refreshMessages, 15000);

      /* Image modal */
      card.querySelectorAll('img[data-enlarge]').forEach(img => {
        img.addEventListener('click', () => {
          document.getElementById('modalImg').src = img.src;
          document.getElementById('imgModal').classList.remove('hidden');
          document.getElementById('imgModal').classList.add('flex');
        });
      });
  });

    

  /* Image modal */
  document.addEventListener('click', e => {
    if (e.target.dataset.enlarge) {
      modalImg.src = e.target.src;
      imgModal.classList.remove('hidden');
      imgModal.classList.add('flex');
    }
  });
  imgModal.addEventListener('click', () => {
    imgModal.classList.add('hidden');
  });

  /* Confetti */
  setTimeout(() => {
    for (let i = 0; i < 80; i++) {
      const c = document.createElement('div');
      c.style.position = 'fixed';
      c.style.top = '-10px';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.width = '8px';
      c.style.height = '8px';
      c.style.background = `hsl(${Math.random()*360},100%,70%)`;
      c.style.borderRadius = '50%';
      c.style.animation = `fall ${3 + Math.random()*2}s linear`;
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 5000);
    }
  }, 800);

  document.querySelectorAll('.auto-text').forEach(p => {
    if (p.scrollHeight > p.clientHeight + 20) {
      p.insertAdjacentHTML(
        'afterend',
        `<div class="text-sm text-black/70 mt-2 italic">— Message continues —</div>`
      );
    }
  });

  const submitUrl = `${window.location.origin}/submit`;

  QRCode.toCanvas(
    document.createElement('canvas'),
    submitUrl,
    { width: 120, margin: 1 },
    function (err, canvas) {
      if (err) console.error(err);
      document.getElementById('qrCode').appendChild(canvas);
    }
  );
});


