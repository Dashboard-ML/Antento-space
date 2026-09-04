let passwordCache = {
    likes: null,
    comments: null
};
const REQUIRED_PASSWORD = "123456";

let failedAttempts = 0;
const MAX_ATTEMPTS = 3;

let isBlocked = false;
let blockUntil = 0;

function showPasswordModal(modalType) {
    if (isBlocked) {
        if (Date.now() < blockUntil) {
            const remainingTime = Math.ceil((blockUntil - Date.now()) / 1000 / 60);
            alert(`Sistema bloqueado. Intente nuevamente en ${remainingTime} minutos.`);
            return;
        } else {
            isBlocked = false;
            failedAttempts = 0;
        }
    }

    const existingModal = document.querySelector('.password-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'password-modal';
    modal.innerHTML = `
        <div class="modal-content password-modal-content">
            <div class="modal-header">
                <h3>Autenticación Requerida</h3>
            </div>
            <div class="modal-body">
                <p>Ingrese la contraseña para acceder a los ${modalType === 'likes' ? 'likes' : 'comentarios'}:</p>
                <input type="password" id="passwordInput" class="password-input" placeholder="Contraseña">
                <p id="passwordError" class="error-message" style="display: none;">Contraseña incorrecta</p>
            </div>
            <div class="modal-footer">
                <button class="modal-btn modal-btn-secondary" id="cancelPassword">Cancelar</button>
                <button class="modal-btn modal-btn-primary" id="confirmPassword">Continuar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const passwordInput = modal.querySelector('#passwordInput');
    const errorMessage = modal.querySelector('#passwordError');
    setTimeout(() => {
        passwordInput.focus();
    }, 100);

    const closeModal = () => {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    };

    const verifyPassword = () => {
        const enteredPassword = passwordInput.value.trim();
        
        if (enteredPassword === REQUIRED_PASSWORD) {
            passwordCache[modalType] = true;
            failedAttempts = 0; 
            closeModal();
            
            if (modalType === 'likes') {
                showLikesModal();
            } else {
                showComentariosModal();
            }
        } else {
            // Contraseña incorrecta
            failedAttempts++;
            errorMessage.textContent = `Contraseña incorrecta. Intentos restantes: ${MAX_ATTEMPTS - failedAttempts}`;
            errorMessage.style.display = 'block';
            passwordInput.value = '';
            passwordInput.focus();
            
            // VERIFICAR SI SE SUPERÓ EL LÍMITE DE INTENTOS
            if (failedAttempts >= MAX_ATTEMPTS) {
                errorMessage.textContent = 'Demasiados intentos fallidos. Bloqueado indefinidamente.';
                modal.querySelector('#confirmPassword').disabled = true;
                

                isBlocked = true;
                blockUntil = Date.now() + (60 * 60 * 1000); 
                setTimeout(() => {
                    closeModal();
                }, 3000);
            }
        }
    };

    // Event listeners
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            verifyPassword();
        }
    });

    modal.querySelector('#confirmPassword').addEventListener('click', verifyPassword);
    modal.querySelector('#cancelPassword').addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Mostrar modal con animación
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}


document.addEventListener('DOMContentLoaded', () => {
  const videos = [
    'reels/vid_2.mp4',
    'reels/vid_1.mp4',
  ];

  const sliderContainer = document.querySelector('.slider-container');
  let currentIndex = 0;
  let isAnimating = false;
  let videoContainers = [];

  function createVideoContainers(videos) {
    videos.forEach((src, index) => {
      const videoId = `video_${index}`;
      const container = document.createElement('div');
      container.classList.add('video-container');
      if (index === 0) container.classList.add('active');

      container.innerHTML = `
        <div class="video-wrapper">

          <div class="likes-container">
            <button class="like-button" data-id="${videoId}">
              <img src="videos/corazon (1).png" alt="Like" class="like-icon">
              <span>0</span>
            </button>
          </div>

          <div class="video-controls">
            <video class="lazy-video" data-src="${src}" loop playsinline preload="auto">
              <source src="${src}" type="video/mp4">
            </video>
            <div class="play-icon-container">
              <img src="videos/pause-button_15732410 (1).png" class="play-icon">
              <img src="videos/play_7477009.png" alt="Pause" class="pause-icon">
            </div>
          </div>
      <div class="navigation-buttons">
        <button class="nav-button prev">▲</button>
        <button class="nav-button next">▼</button>
      </div>


  <div class="comment-slider">
      <div class="comment-hint">Desliza hacia arriba para comentar</div>
      <form class="comentario-form" data-id="${videoId}">
        <input type="text" class="comentario-input" placeholder="Escribe un comentario...">
        <button type="submit" class="comentario-btn">
          <img src="videos/enviar-mensaje.png" alt="Enviar">
        </button>
      </form>



    </div>
  </div>
`;

function setupGlobalFullscreen() {
  const btn = document.getElementById('fullscreen-global');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      const el = document.documentElement;
      (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen).call(el);
    } else {
      const d = document;
      (d.exitFullscreen || d.webkitExitFullscreen || d.msExitFullscreen).call(d);
    }
  });

  function handleFSChange() {
    const icon = btn.querySelector('img');
    const activeVideo = document.querySelector('.video-container.active video');

    if (document.fullscreenElement) {
      if (icon) icon.src = 'recursos/minimize_3303892.png';  // usa tu icono de "salir"
      if (activeVideo) {
        activeVideo.style.width = '100%';
        activeVideo.style.height = '100%';
        activeVideo.style.objectFit = 'contain';
      }
    } else {
      if (icon) icon.src = 'recursos/expand-arrows_5255377.png'; // icono de "entrar"
      document.querySelectorAll('.video-container video').forEach(v => {
        v.style.width = '';
        v.style.height = '';
        v.style.objectFit = '';
      });
    }
  }

  document.addEventListener('fullscreenchange', handleFSChange);
  document.addEventListener('webkitfullscreenchange', handleFSChange);
  document.addEventListener('msfullscreenchange', handleFSChange);
}

setupGlobalFullscreen();

document.addEventListener('DOMContentLoaded', () => {
  let startY, endY;
  
  document.querySelectorAll('.video-wrapper').forEach(wrapper => {
    wrapper.addEventListener('touchstart', function(e) {
      startY = e.touches[0].clientY;
    });
    
    wrapper.addEventListener('touchend', function(e) {
      endY = e.changedTouches[0].clientY;
      if (startY - endY > 30) { 
        this.classList.add('touch-active');
        
        setTimeout(() => {
          if (!wrapper.querySelector('.comentario-input:focus')) {
            this.classList.remove('touch-active');
          }
        }, 5000);
      }
    });
    
    wrapper.querySelector('.comentario-input')?.addEventListener('focus', function() {
      wrapper.classList.add('touch-active');
    });
    
    wrapper.querySelector('.comentario-input')?.addEventListener('blur', function() {
      setTimeout(() => {
        if (!wrapper.querySelector('.comentario-input:focus')) {
          wrapper.classList.remove('touch-active');
        }
      }, 1000);
    });
  });
});

      sliderContainer.appendChild(container);

     
    requestAnimationFrame(() => {
      const video = container.querySelector('video');
      if (!video) return;

      const playIcon = container.querySelector('.play-icon');
      const pauseIcon = container.querySelector('.pause-icon');
      const iconContainer = container.querySelector('.play-icon-container');

      video.pause();
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';

      const toggle = () => {
        iconContainer.style.opacity = '1';
        if (video.paused) {
          video.play().catch(err => console.log('Error al reproducir video:', err));
          pauseIcon.style.display = 'block';
          playIcon.style.display = 'none';
        } else {
          video.pause();
          playIcon.style.display = 'block';
          pauseIcon.style.display = 'none';
        }
        setTimeout(() => (iconContainer.style.opacity = '0'), 600);
      };

      video.addEventListener('click', toggle);
      video.addEventListener('touchstart', e => { e.preventDefault(); toggle(); });
    });
  });
}

  function setupVideoLazyLoading() {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const video = entry.target;
          if (video.hasAttribute('data-src')) {
            video.src = video.dataset.src;
            video.load();
            if (!video.closest('.video-container.active')) {
              video.play().catch(error => {
                console.log('Error al reproducir video:', error);
              });
            }
            video.removeAttribute('data-src');
            observer.unobserve(video);
          }
        } else {
          const video = entry.target;
          if (!video.hasAttribute('data-src') && !video.closest('.video-container.active')) {
            video.pause();
            video.currentTime = 0;
          }
        }
      });
    }, options);

    document.querySelectorAll('.lazy-video').forEach(video => {
      if (video && !video.closest('.video-container.active')) {
        observer.observe(video);
      }
    });
  }

  function preloadNextVideo() {
    if (!videoContainers || videoContainers.length === 0) return;
    
    const nextIndex = (currentIndex + 1) % videoContainers.length;
    const nextContainer = videoContainers[nextIndex];
    
    if (nextContainer) {
      const video = nextContainer.querySelector('video');
      if (video && (!nextContainer.dataset || !nextContainer.dataset.loaded)) {
        video.load();
        nextContainer.dataset.loaded = true;
      }
    }
  }

  function navigateVideo(direction) {
    if (isAnimating || !videoContainers || videoContainers.length === 0) return;
    isAnimating = true;

    const newIndex = direction === 'next'
      ? (currentIndex + 1) % videoContainers.length
      : (currentIndex - 1 + videoContainers.length) % videoContainers.length;

    const currentContainer = videoContainers[currentIndex];
    const nextContainer = videoContainers[newIndex];

    if (currentContainer) {
      const currentVideo = currentContainer.querySelector('video');
      if (currentVideo && !currentVideo.paused) {
        currentVideo.pause();
      }
    }

    if (nextContainer) {
      nextContainer.style.transform = 'translateY(0%)';
    }

    requestAnimationFrame(() => {
      if (currentContainer) {
        currentContainer.style.transform = direction === 'next'
          ? 'translateY(-100%)'
          : 'translateY(100%)';
      }

      setTimeout(() => {
        if (currentContainer) {
          currentContainer.classList.remove('active');
        }
        if (nextContainer) {
          nextContainer.classList.add('active');
          const nextVideo = nextContainer.querySelector('video');
          if (nextVideo) {
            nextVideo.play().catch(error => {
              console.error('Error al reproducir video:', error);
            });
          }
          setupVideoLazyLoading();
        }

        currentIndex = newIndex;
        isAnimating = false;
      }, 400);
    });
  }

  createVideoContainers(videos);
  videoContainers = document.querySelectorAll('.video-container');

  document.querySelector('.prev')?.addEventListener('click', () => navigateVideo('prev'));
  document.querySelector('.next')?.addEventListener('click', () => navigateVideo('next'));

  let touchStartY = 0;
  sliderContainer.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  });

  sliderContainer.addEventListener('touchend', (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;

    if (Math.abs(diff) > 50 && !isAnimating) {
      navigateVideo(diff > 0 ? 'next' : 'prev');
    }
  });


  initLikeButtons();
  initNavigation();
  setTimeout(initComentarios, 0);
});


function playConfettiAnimation() {
  const container = document.getElementById('lottie-container');
  if (!container) {
    console.error('No se encontró el contenedor Lottie');
    return;
  }

  container.innerHTML = '';

  const animElement = document.createElement('div');
  animElement.style.width = '100%';
  animElement.style.height = '100%';
  container.appendChild(animElement);

  if (typeof lottie === 'undefined') {

  }

  try {
    const anim = lottie.loadAnimation({
      container: animElement,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      path: 'videos/Corazon.json'
    });

    anim.addEventListener('complete', () => {
      anim.destroy();
      container.innerHTML = '';
    });
  } catch (error) {

  }
}

async function addLike(videoId, btn) {
  // Obtener el nombre de usuario del localStorage
  const usuario = localStorage.getItem('usuarioNombre') || 'Anónimo';
  
  // Obtener el nombre del video desde el contenedor
  const videoContainer = btn.closest('.video-container');
  const videoElement = videoContainer.querySelector('video source');
  const videoName = videoElement ? videoElement.src.split('/').pop().replace('.mp4', '') : `Video ${videoId.replace('video_', '')}`;

  try {
    await db.collection("likes").add({
      videoId: videoId,
      videoName: videoName, // Guardar nombre del video
      usuario: usuario,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Actualizar contador visual
    const count = btn.querySelector('span');
    count.textContent = parseInt(count.textContent) + 1;
    
    // Cambiar icono y deshabilitar botón
    btn.querySelector('img.like-icon').src = 'videos/corazon.png';
    btn.classList.add('liked');
    btn.disabled = true;

    // Marcar como likeado en sessionStorage
    sessionStorage.setItem(`liked_${videoId}`, "true");

    // Reproducir animación
    playConfettiAnimation();
    
  } catch (error) {
    console.error("Error al guardar like:", error);
    showToast('Error al dar like');
  }
}
async function initLikeButtons() {
  const buttons = document.querySelectorAll('.like-button');

  buttons.forEach(async (btn) => {
    const videoId = btn.dataset.id || 'video_0';

    // Leer contador inicial desde Firestore
    try {
      const snapshot = await db.collection("likes").where("videoId", "==", videoId).get();
      btn.querySelector('span').textContent = snapshot.size || 0;
    } catch (err) {
      console.warn('Error leyendo likes: ', err);
    }

    // Revisar si ya dio like en esta sesión
    if (sessionStorage.getItem(`liked_${videoId}`)) {
      btn.classList.add('liked');
      btn.disabled = true;
      btn.querySelector('img.like-icon').src = 'videos/corazon.png';
    }

    btn.addEventListener('click', async () => {
      // Si ya dio like en esta sesión, no dejar repetir
      if (sessionStorage.getItem(`liked_${videoId}`)) {
        showToast('Ya diste like a este video');
        return;
      }

      try {
        // Obtener usuario del localStorage
        const usuario = localStorage.getItem('usuarioNombre') || 'Anónimo';
        
        // Obtener el nombre del video
        const videoContainer = btn.closest('.video-container');
        const videoElement = videoContainer.querySelector('video source');
        const videoName = videoElement ? videoElement.src.split('/').pop().replace('.mp4', '') : `Video ${videoId.replace('video_', '')}`;
        
        await db.collection("likes").add({
          videoId,
          videoName: videoName, // Guardar nombre del video
          usuario: usuario,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Actualizar contador en pantalla
        const count = btn.querySelector('span');
        count.textContent = parseInt(count.textContent) + 1;

        // Guardar en la sesión que ya dio like
        sessionStorage.setItem(`liked_${videoId}`, "true");

        // Feedback visual
        btn.classList.add('liked');
        btn.disabled = true;
        btn.querySelector('img.like-icon').src = 'videos/corazon.png';
        
        playConfettiAnimation();

      } catch (err) {
        console.error("Error al dar like:", err);
        showToast('Error al dar like');
      }
    });
  });
}
function initNavigation() {
  const videoContainers = document.querySelectorAll('.video-container');
  let currentIndex = 0;
  let isAnimating = false;

  function restartVideo(videoElement) {
    videoElement.currentTime = 0;
    videoElement.pause();
    void videoElement.play();
  }

  function navigateVideo(direction) {
    if (isAnimating) return;
    isAnimating = true;

    const newIndex = direction === 'next'
      ? (currentIndex + 1) % videoContainers.length
      : (currentIndex - 1 + videoContainers.length) % videoContainers.length;

    const currentContainer = videoContainers[currentIndex];
    const nextContainer = videoContainers[newIndex];
    const nextVideo = nextContainer.querySelector('video');
    restartVideo(nextVideo);

    nextContainer.style.transform = 'translateY(0%)';

    requestAnimationFrame(() => {
      currentContainer.style.transform = direction === 'next'
        ? 'translateY(-100%)'
        : 'translateY(100%)';

      setTimeout(() => {
        currentContainer.classList.remove('active');
        nextContainer.classList.add('active');
        const currentVideo = currentContainer.querySelector('video');
        currentVideo.pause();
        currentIndex = newIndex;
        isAnimating = false;
      }, 400);
    });
  }

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('prev')) {
    navigateVideo('prev');
  } else if (e.target.classList.contains('next')) {
    navigateVideo('next');
  }
});
}

function startWaveBackground() {
  const canvas = document.getElementById('background-lines');
  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const waveCount = 5;
  const neonColors = [
    'rgba(239, 162, 127, 0.74)',
    'rgba(0, 85, 140, 0.72)',
    'rgb(0, 167, 157)',
    'rgb(59, 36, 71)',
    'rgba(227, 237, 237, 0.61)'
  ];

  const waves = [];
  for (let i = 0; i < waveCount; i++) {
    waves.push({
      amplitude: 30 + Math.random() * 140,
      wavelength: 350 + Math.random() * 100,
      speed: 0.01 + Math.random() * 0.5,
      offset: Math.random() * 2000,
      color: neonColors[i % neonColors.length]
    });
  }

  const svgContainer = document.getElementById('floating-svgs') || createSVGContainer();
  const svgElements = [];

  for (let i = 0; i < 5; i++) {
    const img = document.createElement('img');
    img.src = 'videos/+.svg';
    img.classList.add('floating-svg');

    img.dataset.x = 100 + Math.random() * width;
    img.dataset.yWave = Math.floor(Math.random() * waveCount);
    img.style.left = img.dataset.x + 'px';
    svgContainer.appendChild(img);
    svgElements.push(img);
  }

  function createSVGContainer() {
    const div = document.createElement('div');
    div.id = 'floating-svgs';
    div.style.position = 'fixed';
    div.style.top = 0;
    div.style.left = 0;
    div.style.width = '100vw';
    div.style.height = '100vh';
    div.style.zIndex = 1;
    div.style.pointerEvents = 'none';
    div.style.willChange = 'transform';
    div.style.transform = 'translateZ(0)';
    document.body.appendChild(div);
    return div;
  }

  let animationRunning = true;
  document.addEventListener('visibilitychange', () => {
    animationRunning = !document.hidden;
  });

  let frameCount = 0;

  function draw() {
    if (!animationRunning) {
      requestAnimationFrame(draw);
      return;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 2;

    waves.forEach((wave, i) => {
      ctx.beginPath();
      ctx.shadowColor = wave.color;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = wave.color;

      for (let x = 0; x <= width; x++) {
        const y = height / 2 + Math.sin((x + wave.offset) / wave.wavelength) * wave.amplitude;
        ctx.lineTo(x, y + i * 30 - 80);
      }

      ctx.stroke();
      wave.offset += wave.speed;
    });

    if (frameCount % 1 === 0) {
      svgElements.forEach(svg => {
        let x = parseFloat(svg.dataset.x);
        let wave = waves[svg.dataset.yWave];
        let y = height / 3 + Math.sin((x + wave.offset) / wave.wavelength) * wave.amplitude;
        let scale = 1 + Math.sin((x + wave.offset) / 80) * 0.3;

        svg.style.left = x + 'px';
        svg.style.top = y + 'px';
        svg.style.transform = `scale(${scale})`;

        x -= 0.5;
        if (x < -50) x = width + Math.random() * 500;
        svg.dataset.x = x;
      });
    }

    frameCount++;
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  draw();
}


document.addEventListener('DOMContentLoaded', startWaveBackground);

function showConfirmationModal() {
  const existingModal = document.querySelector('.confirm-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.className = 'confirm-modal';
  modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Confirmar acción</h3>
            </div>
            <div class="modal-body">
                <p>¿Estás seguro que deseas regresar a la sala?.</p>
            </div>
            <div class="modal-footer">
                <button class="modal-btn modal-btn-secondary" id="cancelExit">Cancelar</button>
                <button class="modal-btn modal-btn-primary" id="confirmExit">Sí, salir</button>
            </div>
        </div>
    `;

  document.body.appendChild(modal);
  setTimeout(() => {
    modal.classList.add('active');

    const modalHeader = modal.querySelector('.modal-header');
    createModalParticles(modalHeader, 12);
  }, 10);

  const closeModal = () => {
    modal.classList.remove('active');
    setTimeout(() => {
      modal.remove();
    }, 300);
  };

  const confirmAndRedirect = () => {
    modal.classList.remove('active');
    setTimeout(() => {
      modal.remove();
      window.location.href = "../sla2.html";
    }, 300);
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    } else if (e.target.id === 'cancelExit') {
      closeModal();
    } else if (e.target.id === 'confirmExit') {
      confirmAndRedirect();
    }
  });

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
}



document.addEventListener('DOMContentLoaded', () => {
  startWaveBackground();


  const style = document.createElement('style');
  style.textContent = `
        @keyframes float-up {
            0% {
                transform: translate(0, 0);
                opacity: 0.8;
            }
            100% {
                transform: translate(${Math.random() * 40 - 20}px, -${Math.random() * 30 + 20}px);
                opacity: 0;
            }
        }
    `;
  document.head.appendChild(style);
});

document.addEventListener('DOMContentLoaded', () => {
  const registro = document.getElementById('registro-container');
  const videoSlider = document.querySelector('.video-slider');
  registro.style.display = 'flex';
  videoSlider.style.display = 'none';
btnContinuar.addEventListener('click', () => {
  const inputNombre = document.getElementById('nombreUsuario');
  const valor = inputNombre.value.trim();
  

  let errorMsg = document.getElementById('nombre-error');
  if (errorMsg) errorMsg.remove();
  
  if (!valor) {
    errorMsg = document.createElement('div');
    errorMsg.id = 'nombre-error';
    errorMsg.textContent = 'Por favor, escribe tu número SAP';
    errorMsg.style.color = '#eee6e2ff';
    errorMsg.style.fontSize = '0.98em';
    errorMsg.style.marginTop = '9px';
    errorMsg.style.fontWeight = '1000';
    inputNombre.insertAdjacentElement('afterend', errorMsg);
    inputNombre.focus();
    return;
  }

  if (!/^\d+$/.test(valor)) {
    errorMsg = document.createElement('div');
    errorMsg.id = 'nombre-error';
    errorMsg.textContent = 'Solo se permiten números';
    errorMsg.style.color = '#eee6e2ff';
    errorMsg.style.fontSize = '0.98em';
    errorMsg.style.marginTop = '9px';
    errorMsg.style.fontWeight = '1000';
    inputNombre.insertAdjacentElement('afterend', errorMsg);
    inputNombre.focus();
    return;
  }
  

  if (valor.length > 6) {
    errorMsg = document.createElement('div');
    errorMsg.id = 'nombre-error';
    errorMsg.textContent = 'Máximo 6 caracteres';
    errorMsg.style.color = '#eee6e2ff';
    errorMsg.style.fontSize = '0.98em';
    errorMsg.style.marginTop = '9px';
    errorMsg.style.fontWeight = '1000';
    inputNombre.insertAdjacentElement('afterend', errorMsg);
    inputNombre.focus();
    return;
  }


    localStorage.setItem('usuarioNombre', valor);
    registro.style.display = 'none';
    videoSlider.style.display = 'flex';

    const saludo = document.getElementById('usuarioNombre');
    if (saludo) saludo.textContent = ` ${valor}`;

    setTimeout(() => {
      const firstVideoContainer = document.querySelector('.video-container.active');
      if (firstVideoContainer) {
        const video = firstVideoContainer.querySelector('video');
        if (video) {
          video.muted = false; 
          video.play().catch(error => {
            console.error('Error al reproducir el video:', error);
      
            video.controls = true;
          });
          
       
          const pauseIcon = firstVideoContainer.querySelector('.pause-icon');
          const playIcon = firstVideoContainer.querySelector('.play-icon');
          if (pauseIcon) pauseIcon.style.display = 'block';
          if (playIcon) playIcon.style.display = 'none';
        }
      }
    }, 100);
  });
});
async function continuarSinLocalStorage() {
  const inputNombre = document.getElementById('nombreUsuario').value.trim();
  if (!inputNombre) {
    alert('Por favor, escribe tu nombre.');
    return;
  }

  try {

    await db.collection("usuarios").add({
      nombre: inputNombre,
      fecha: firebase.firestore.FieldValue.serverTimestamp()
    });


    registro.style.display = 'none';
    videoSlider.style.display = 'flex';

    const saludo = document.getElementById('usuarioNombre');
    if (saludo) saludo.textContent = inputNombre;

  } catch (error) {
    console.error("Error al guardar en Firebase:", error);
    alert("Error al guardar tu nombre. Intenta nuevamente.");
  }
}
async function showLikesModal() {
  try {
    const querySnapshot = await db.collection("likes").orderBy("timestamp", "desc").get();
    
    const likesData = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const timestamp = data.timestamp;
      
      return {
        id: doc.id,
        ...data,
        timestamp: timestamp 
      };
    });

    const modal = document.createElement('div');
    modal.className = 'slim-modal';
    modal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h2>Likes</h2>
          <div class="header-actions">
            <button class="export-btn" title="Descargar Excel">
              <img src="videos/archivo.png" alt="Exportar" class="export-icon">
            </button>
            <span class="close-modal">&times;</span>
          </div>
        </div>
        <div class="modal-body">
          ${likesData.length === 0 ?
        '<p class="empty-msg">No hay registros de likes</p>' :
        `<div class="slim-table">
              <table>
                <thead>
                  <tr>
                    <th>Video</th>
                    <th>Usuario</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  ${likesData.map(like => {
                    let fecha = 'N/A';
                    let hora = 'N/A';
                    
                    if (like.timestamp) {
                      try {
                        const dateObj = like.timestamp.toDate ? like.timestamp.toDate() : new Date(like.timestamp);
                        fecha = dateObj.toLocaleDateString('es-ES');
                        hora = dateObj.toLocaleTimeString('es-ES');
                      } catch (e) {
                        console.warn('Error formateando fecha:', e);
                      }
                    }
                    
                    return `
                    <tr>
                      <td>${like.videoName || like.videoId || 'N/A'}</td>
                      <td>${like.usuario || 'Anónimo'}</td>
                      <td>${fecha}</td>
                      <td>${hora}</td>
                    </tr>
                  `}).join('')}
                </tbody>
              </table>
            </div>`
      }
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.export-btn').addEventListener('click', () => {
      exportToExcel(likesData);
    });

    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => e.target === modal && modal.remove());

  } catch (error) {
    console.error("Error cargando likes:", error);
  }
}

async function showComentariosModal() {
  try {
    const snapshot = await db.collection("comentarios")
      .orderBy("timestamp", "desc").get();
    
    const comentariosData = snapshot.docs.map(doc => {
      const data = doc.data();
      const timestamp = data.timestamp;
      
      return {
        id: doc.id,
        ...data,
        timestamp: timestamp 
      };
    });

    const videosUnicos = [...new Set(comentariosData.map(c => c.videoName || c.videoId))].sort();

    const modal = document.createElement('div');
    modal.className = 'slim-modal';
    modal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h2>Comentarios</h2>
          <div class="header-actions">
            <button class="export-btn" title="Descargar Excel">
              <img src="videos/archivo.png" alt="Exportar" class="export-icon">
            </button>
            <span class="close-modal">&times;</span>
          </div>
        </div>
        <div class="modal-body">
          <div class="filter-controls" style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
            <select id="videoSelectorComentarios" style="width: 100%; padding: 8px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 0.8rem;">
              <option value="" selected>Todos los videos</option>
              ${videosUnicos.map(name => 
                `<option value="${name}">${name}</option>`
              ).join('')}
            </select>
          </div>
          ${comentariosData.length === 0 ?
            '<p class="empty-msg" style="padding: 20px; text-align: center; color: #718096;">No hay registros de comentarios</p>' :
            `<div class="slim-table">
              <table>
                <thead>
                  <tr>
                    <th>Video</th>
                    <th>Usuario</th>
                    <th>Comentario</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  ${comentariosData.map(comentario => {
                    let fecha = 'N/A';
                    let hora = 'N/A';
                    
                    if (comentario.timestamp) {
                      try {
                        const dateObj = comentario.timestamp.toDate ? comentario.timestamp.toDate() : new Date(comentario.timestamp);
                        fecha = dateObj.toLocaleDateString('es-ES');
                        hora = dateObj.toLocaleTimeString('es-ES');
                      } catch (e) {
                        console.warn('Error formateando fecha:', e);
                      }
                    }
                    
                    return `
                    <tr data-video="${comentario.videoName || comentario.videoId || ''}">
                      <td>${comentario.videoName || comentario.videoId || 'N/A'}</td>
                      <td>${comentario.usuario || 'Anónimo'}</td>
                      <td style="max-width: 200px; word-wrap: break-word;">${comentario.texto || ''}</td>
                      <td>${fecha}</td>
                      <td>${hora}</td>
                    </tr>
                  `}).join('')}
                </tbody>
              </table>
            </div>`
          }
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    const filtrarComentarios = (videoSeleccionado = '') => {
      const filas = modal.querySelectorAll('tbody tr');
      filas.forEach(fila => {
        if (!videoSeleccionado || fila.dataset.video === videoSeleccionado) {
          fila.style.display = '';
        } else {
          fila.style.display = 'none';
        }
      });
    };
    modal.querySelector('#videoSelectorComentarios').addEventListener('change', e => {
      const videoSeleccionado = e.target.value;
      filtrarComentarios(videoSeleccionado);
    });

    modal.querySelector('.export-btn').addEventListener('click', () => {
      const videoSeleccionado = modal.querySelector('#videoSelectorComentarios').value;
      let datosAExportar = comentariosData;
      
      if (videoSeleccionado) {
        datosAExportar = comentariosData.filter(c => 
          (c.videoName || c.videoId) === videoSeleccionado
        );
      }
      
      exportComentariosToExcel(datosAExportar);
    });

    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => e.target === modal && modal.remove());

  } catch (error) {
    console.error("Error cargando comentarios:", error);
    showToast('Error al cargar comentarios', true);
  }
}



async function showLikesModal() {
  try {
    const querySnapshot = await db.collection("likes").orderBy("timestamp", "desc").get();
    
    const likesData = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const timestamp = data.timestamp;
      
      return {
        id: doc.id,
        ...data,
        fecha: timestamp ? new Date(timestamp.toDate ? timestamp.toDate() : timestamp).toLocaleString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'Fecha no disponible'
      };
    });

    const modal = document.createElement('div');
    modal.className = 'slim-modal';
    modal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h2>Likes</h2>
          <div class="header-actions">
            <button class="export-btn" title="Descargar Excel">
              <img src="videos/archivo.png" alt="Exportar" class="export-icon">
            </button>
            <span class="close-modal">&times;</span>
          </div>
        </div>
        <div class="modal-body">
          ${likesData.length === 0 ?
        '<p class="empty-msg">No hay registros de likes</p>' :
        `<div class="slim-table">
              <table>
                <thead>
                  <tr>
                    <th>Video</th>
                    <th>Usuario</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  ${likesData.map(like => `
                    <tr>
                      <td>${like.videoName || like.videoId || 'N/A'}</td>
                      <td>${like.usuario || 'Anónimo'}</td>
                      <td>${like.fecha}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>`
      }
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.export-btn').addEventListener('click', () => {
      exportToExcel(likesData);
    });

    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => e.target === modal && modal.remove());

  } catch (error) {
    console.error("Error cargando likes:", error);
    // Manejo de errores...
  }
}

document.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key === 'F1' && !document.querySelector('.slim-modal')) {
        e.preventDefault();
        
        // Verificar si ya está autenticado para likes
        if (passwordCache.likes) {
            showLikesModal();
        } else {
            showPasswordModal('likes');
        }
    }
});

function exportToExcel(data) {
  try {
    if (typeof XLSX === 'undefined') {
      showToast('Error: Biblioteca para Excel no cargada', true);
      return;
    }

    if (!data || data.length === 0) {
      showToast('No hay datos para exportar', true);
      return;
    }

    // Preparar datos con fecha y hora separadas
    const excelData = data.map(item => {
      let fecha = 'Fecha no disponible';
      let hora = 'Hora no disponible';
      
      if (item.timestamp) {
        try {
          const dateObj = item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
          fecha = dateObj.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          hora = dateObj.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        } catch (e) {
          console.warn('Error procesando fecha:', e);
        }
      }
      
      return {
        'Video': item.videoName || item.videoId || 'N/A',
        'Usuario': item.usuario || 'Anónimo',
        'Fecha': fecha,
        'Hora': hora
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Ajustar anchos de columnas
    const colWidths = [
      { wch: 30 }, // Video
      { wch: 20 }, // Usuario
      { wch: 12 }, // Fecha (más estrecha)
      { wch: 10 }  // Hora (más estrecha)
    ];
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, "Likes");
    
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    const fileName = `registro_likes_${dateStr}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    showToast('Excel descargado correctamente');
    
  } catch (error) {
    console.error("Error al exportar a Excel:", error);
    showToast('Error al descargar el Excel', true);
  }
}

function exportComentariosToExcel(data) {
  try {
    if (typeof XLSX === 'undefined') {
      showToast('Error: Biblioteca para Excel no cargada', true);
      return;
    }

    if (!data || data.length === 0) {
      showToast('No hay comentarios para exportar', true);
      return;
    }

    // Preparar datos con fecha y hora separadas
    const excelData = data.map(item => {
      let fecha = 'Fecha no disponible';
      let hora = 'Hora no disponible';
      
      if (item.timestamp) {
        try {
          const dateObj = item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
          fecha = dateObj.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          hora = dateObj.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        } catch (e) {
          console.warn('Error procesando fecha:', e);
        }
      } else if (item.fecha) {
        // Si ya viene una fecha formateada, intentar separarla
        const fechaParts = item.fecha.split(' ');
        if (fechaParts.length >= 2) {
          fecha = fechaParts[0];
          hora = fechaParts[1];
        }
      }
      
      return {
        'Video': item.videoDisplay || item.videoName || item.videoId || 'N/A',
        'Usuario': item.usuario || 'Anónimo',
        'Comentario': item.texto,
        'Fecha': fecha,
        'Hora': hora
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    const colWidths = [
      { wch: 30 }, // Video
      { wch: 20 }, // Usuario
      { wch: 50 }, // Comentario
      { wch: 12 }, // Fecha
      { wch: 10 }  // Hora
    ];
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, "Comentarios");
    
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    const fileName = `registro_comentarios_${dateStr}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    showToast('Excel de comentarios descargado correctamente');
    
  } catch (error) {
    console.error("Error al exportar comentarios a Excel:", error);
    showToast('Error al descargar el Excel de comentarios', true);
  }
}

// Asegúrate de tener esta función showToast mejorada
function showToast(message = '¡Comentario enviado!', isError = false) {
  // Eliminar toast existente si hay uno
  const existingToast = document.getElementById('toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Crear nuevo elemento toast
  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background-color: ${isError ? '#ff4444' : '#4CAF50'};
    color: white;
    padding: 12px 24px;
    border-radius: 4px;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.3s;
    font-family: Arial, sans-serif;
  `;
  
  document.body.appendChild(toast);
  
  // Mostrar toast
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);
  
  // Ocultar después de 2 segundos
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 2000);
}

function initComentarios() {
  document.querySelectorAll('.comentario-form').forEach(form => {
    const videoId = form.dataset.id;
    const input = form.querySelector('.comentario-input');

form.addEventListener('submit', async e => {
  e.preventDefault();
  const texto = input.value.trim();
  if (!texto) return;
  
  const btn = form.querySelector('.comentario-btn');
  btn.classList.add('sent');
  setTimeout(() => btn.classList.remove('sent'), 600);

      await db.collection('comentarios').add({
        videoId,
        usuario: localStorage.getItem('usuarioNombre') || 'Anónimo',
        texto,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

      input.value = '';
      showToast();
    });
  });
}

function showToast(message = '¡Comentario enviado!') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.display = 'block';
  toast.style.opacity = '1';

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 300);
  }, 2000); 
}



document.addEventListener('keydown', e => {
    if (e.shiftKey && e.key === 'F2' && !document.querySelector('.slim-modal')) {
        e.preventDefault();
  
        if (passwordCache.comments) {
            showComentariosModal();
        } else {
            showPasswordModal('comments');
        }
    }
});


document.querySelectorAll('.comentario-input').forEach(input => {
  input.addEventListener('focus', function() {
    this.closest('.comentario-form').style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
  });
  
  input.addEventListener('blur', function() {
    this.closest('.comentario-form').style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
  });
});

function initComentarios() {
  document.querySelectorAll('.comentario-form').forEach(form => {
    const videoId = form.dataset.id;
    const input = form.querySelector('.comentario-input');
    const btn = form.querySelector('.comentario-btn');

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const texto = input.value.trim();
      if (!texto) return;
      btn.innerHTML = '<div class="loading-spinner"></div>';
      btn.disabled = true;
      
      try {

        const videoContainer = form.closest('.video-container');
        const videoElement = videoContainer.querySelector('video source');
        let videoName = `Video ${parseInt(videoId.replace('video_', '')) + 1}`; 
  
        if (videoElement && videoElement.src) {
          const srcParts = videoElement.src.split('/');
          videoName = srcParts[srcParts.length - 1].replace('.mp4', '');
        }

        console.log('Enviando comentario para:', videoName);

        await db.collection('comentarios').add({
          videoId: videoName,
          videoName: videoName, 
          usuario: localStorage.getItem('usuarioNombre') || 'Anónimo',
          texto,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        btn.innerHTML = '<img src="videos/enviar-mensaje.png" alt="Enviar">';
        btn.classList.add('sent');
        setTimeout(() => btn.classList.remove('sent'), 600);
        
        input.value = '';
        showToast();
      } catch (error) {
        console.error("Error al enviar comentario:", error);
        btn.innerHTML = '<img src="videos/enviar-mensaje.png" alt="Enviar">';
        showToast('Error al enviar', true);
      } finally {
        btn.disabled = false;
      }
    });
  });
}
const style = document.createElement('style');
style.textContent = `
  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 3px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
