import * as THREE from 'three';

let interactableHotspots = [];
let showInteractHint = false;
let wasClose = false;
let hoverSound, interactSound;

const audioLoader = new THREE.AudioLoader();
audioLoader.load('sounds/ui-sounds-pack-3-8-359730.mp3', (buffer) => {
  hoverSound = buffer;
});

export function configurarHotspot(escenarioModel, nombreHotspot, urlRedireccion, scene, tamaño = 0.2) {
  const hotspot = escenarioModel.getObjectByName(nombreHotspot);
  if (!hotspot) {
    console.warn(`No se encontró el hotspot: ${nombreHotspot}`);
    return;
  }

  const worldPosition = new THREE.Vector3();
  hotspot.getWorldPosition(worldPosition);

  const colorOctaedro = new THREE.Color(59/255, 36/255, 71/255); 
  const colorParticulas = new THREE.Color(0/255, 167/255, 157/255);
  const octahedronGeometry = new THREE.OctahedronGeometry(tamaño, 0);
  const octahedronMaterial = new THREE.MeshStandardMaterial({
    color: colorOctaedro,
    emissive: colorOctaedro,
    emissiveIntensity: 1.3,
    metalness: 0.3,
    roughness: 0.4,
    transparent: true,
    opacity: 0, 
    side: THREE.DoubleSide
  });

  const octahedron = new THREE.Mesh(octahedronGeometry, octahedronMaterial);
  octahedron.position.copy(worldPosition);
  octahedron.position.y += 0.3;
  scene.add(octahedron);

  const particleCount = 14;
  const particles = new THREE.Group();

  for (let i = 0; i < particleCount; i++) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 8, 8),
      new THREE.MeshBasicMaterial({ 
        color: colorParticulas,
        transparent: true,
        opacity: 1.0
      })
    );
    
    const angle = (i / particleCount) * Math.PI * 2;
    const radius = tamaño * 1.5;
    particle.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    particles.add(particle);
  }

  octahedron.add(particles);
  let actionFunction;
  
  if (nombreHotspot === "punto3") {
    // Para el hotspot "punto3", mostrar modal en lugar de redireccionar
    actionFunction = () => {
      console.log(`Interactuando con ${nombreHotspot} - Mostrando información de Atento`);
      if (interactSound) {
        const audio = new THREE.Audio(new THREE.AudioListener());
        audio.setBuffer(interactSound);
        audio.play();
      }
      mostrarModalAtento();
    };
  } else if (nombreHotspot === "punto2") {
    // Para el hotspot "punto2", mostrar galería de imágenes
    actionFunction = () => {
      console.log(`Interactuando con ${nombreHotspot} - Mostrando galería de imágenes`);
      if (interactSound) {
        const audio = new THREE.Audio(new THREE.AudioListener());
        audio.setBuffer(interactSound);
        audio.play();
      }
      mostrarModalGaleria();
    };
} else if (nombreHotspot === "punto1") {
  // Para el hotspot "punto1", mostrar en modal (igual que punto4 y punto5)
  actionFunction = () => {
    console.log(`Interactuando con ${nombreHotspot} - Mostrando desarrollo en modal`);
    if (interactSound) {
      const audio = new THREE.Audio(new THREE.AudioListener());
      audio.setBuffer(interactSound);
      audio.play();
    }
    // Mostrar en modal después de un pequeño delay para que suene el audio
    setTimeout(() => {
      mostrarModalConIframe("carrucel/index.html", "Desarrollo & Capacitación");
    }, 300);
  };

} else if (nombreHotspot === "punto4") {
  // Para el hotspot "punto4", mostrar en modal
  actionFunction = () => {
    console.log(`Interactuando con ${nombreHotspot} - Mostrando INE en modal`);
    if (interactSound) {
      const audio = new THREE.Audio(new THREE.AudioListener());
      audio.setBuffer(interactSound);
      audio.play();
    }
    // Mostrar en modal después de un pequeño delay para que suene el audio
    setTimeout(() => {
      mostrarModalConIframe("INE/index.html", "Sistema INE");
    }, 300);
  };

  } else if (nombreHotspot === "punto6") {
  // Para el hotspot "punto4", mostrar en modal
  actionFunction = () => {
    console.log(`Interactuando con ${nombreHotspot} - Mostrando lavavajillas`);
    if (interactSound) {
      const audio = new THREE.Audio(new THREE.AudioListener());
      audio.setBuffer(interactSound);
      audio.play();
    }
    // Mostrar en modal después de un pequeño delay para que suene el audio
    setTimeout(() => {
      window.open("Lavavajillas/presentacion.html", "_blank", "noopener,noreferrer");
    }, 300);
  };

} else if (nombreHotspot === "punto5") {
  // Para el hotspot "punto5", mostrar en modal
  actionFunction = () => {
    console.log(`Interactuando con ${nombreHotspot} - Mostrando Atento Reels en modal`);
    if (interactSound) {
      const audio = new THREE.Audio(new THREE.AudioListener());
      audio.setBuffer(interactSound);
      audio.play();
    }
    // Mostrar en modal después de un pequeño delay para que suene el audio
    setTimeout(() => {
      mostrarModalConIframe("AtentoReels/index.html", "Atento Reels");
    }, 300);
  };


} else if (nombreHotspot === "punto7") {
  // Para el hotspot "punto7", abrir en nueva ventana
  actionFunction = () => {
    console.log(`Interactuando con ${nombreHotspot} - Abriendo Super Mariano en nueva ventana`);
    if (interactSound) {
      const audio = new THREE.Audio(new THREE.AudioListener());
      audio.setBuffer(interactSound);
      audio.play();
    }
    // Abrir en nueva ventana después de un pequeño delay para que suene el audio
    setTimeout(() => {
      window.open("Super Mariano/index.html", "_blank", "noopener,noreferrer");
    }, 300);
  };

} else {
  // Para otros hotspots, mantener el comportamiento original
  actionFunction = () => {
    console.log(`Interactuando con ${nombreHotspot}`);
    if (interactSound) {
      const audio = new THREE.Audio(new THREE.AudioListener());
      audio.setBuffer(interactSound);
      audio.play();
    }
    window.location.href = urlRedireccion;
  };
}
  hotspot.userData = {
    isInteractive: true,
    icon: octahedron,
    particles: particles,
    size: tamaño,
    position: worldPosition.clone(),
    action: actionFunction
  };

  interactableHotspots.push(hotspot);
}

function mostrarModalGaleria() {
  let modal = document.getElementById('galeria-modal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'galeria-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.95);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: rgba(45, 132, 246, 0.95);
      padding: 15px;
      border-radius: 10px;
      width: 95%;
      height: 95%;
      max-width: 1200px;
      max-height: 90vh;
      overflow: hidden;
      color: white;
      position: relative;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = 'X';
    closeButton.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      border-radius: 50%;
      width: 35px;
      height: 35px;
      color: white;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.3s;
      z-index: 10001;
    `;
    
    closeButton.onmouseover = () => {
      closeButton.style.background = 'rgba(255, 255, 255, 0.4)';
    };
    
    closeButton.onmouseout = () => {
      closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
    };
    
    closeButton.onclick = () => {
      modal.style.opacity = '0';
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    };
    
    const title = document.createElement('h2');
    title.textContent = 'Galería de Imágenes';
    title.style.cssText = `
      margin: 0 0 15px 0;
      text-align: center;
      font-size: 20px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    `;
    
    const galleryContainer = document.createElement('div');
    galleryContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      height: calc(100% - 80px);
    `;
    
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
      width: 100%;
      height: calc(100% - 70px);
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 15px;
      border-radius: 8px;
      background-color: rgba(0, 0, 0, 0.3);
    `;
    
    const mainImage = document.createElement('img');
    mainImage.id = 'galeria-imagen-principal';
    mainImage.style.cssText = `
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    `;
    
    imageContainer.appendChild(mainImage);
    const controlsContainer = document.createElement('div');
    controlsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      gap: 10px;
    `;
  
    const navigationContainer = document.createElement('div');
    navigationContainer.style.cssText = `
      display: flex;
      justify-content: center;
      gap: 15px;
    `;
    
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '◀ Anterior';
    prevButton.style.cssText = `
      padding: 8px 16px;
      background: linear-gradient(135deg, #3498db, #2980b9);
      border: none;
      border-radius: 5px;
      color: white;
      cursor: pointer;
      font-weight: bold;
      transition: transform 0.2s, background 0.3s;
    `;
    
    const nextButton = document.createElement('button');
    nextButton.innerHTML = 'Siguiente ▶';
    nextButton.style.cssText = `
      padding: 8px 16px;
      background: linear-gradient(135deg, #3498db, #2980b9);
      border: none;
      border-radius: 5px;
      color: white;
      cursor: pointer;
      font-weight: bold;
      transition: transform 0.2s, background 0.3s;
    `;
    
    prevButton.onmouseover = nextButton.onmouseover = function() {
      this.style.background = 'linear-gradient(135deg, #2980b9, #3498db)';
      this.style.transform = 'scale(1.05)';
    };
    
    prevButton.onmouseout = nextButton.onmouseout = function() {
      this.style.background = 'linear-gradient(135deg, #3498db, #2980b9)';
      this.style.transform = 'scale(1)';
    };
    
    navigationContainer.appendChild(prevButton);
    navigationContainer.appendChild(nextButton);
    const counter = document.createElement('div');
    counter.id = 'galeria-contador';
    counter.style.cssText = `
      text-align: center;
      font-size: 14px;
      font-weight: bold;
      color: #ccc;
    `;
    
    controlsContainer.appendChild(navigationContainer);
    controlsContainer.appendChild(counter);
    galleryContainer.appendChild(imageContainer);
    galleryContainer.appendChild(controlsContainer);
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(galleryContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    inicializarGaleria(modal, mainImage, counter, prevButton, nextButton, closeButton);
  }
  
  modal.style.display = 'flex';
  setTimeout(() => {
    modal.style.opacity = '1';
    modal.focus({ preventScroll: true });
  }, 10);
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.style.opacity = '0';
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    }
  };
}

function inicializarGaleria(modal, mainImage, counter, prevButton, nextButton, closeButton) {
  const imagenes = [
    'imagenes/Valores atento/1.jpg',
    'imagenes/Valores atento/2.jpg',
    'imagenes/Valores atento/3.jpg',
    'imagenes/Valores atento/4.jpg',
    'imagenes/Valores atento/5.jpg',
    'imagenes/Valores atento/6.jpg',
    'imagenes/Valores atento/7.jpg'
  ];
  
  let imagenActual = 0;
  
  function cargarImagen(index) {
    if (index >= 0 && index < imagenes.length) {
      imagenActual = index;
      mainImage.src = imagenes[imagenActual];
      actualizarContador();
    }
  }
  
  function actualizarContador() {
    counter.textContent = `${imagenActual + 1} / ${imagenes.length}`;
  }
  
  // Event listeners para los botones de navegación
  prevButton.onclick = function() {
    let nuevoIndice = imagenActual - 1;
    if (nuevoIndice < 0) nuevoIndice = imagenes.length - 1;
    cargarImagen(nuevoIndice);
  };
  
  nextButton.onclick = function() {
    let nuevoIndice = imagenActual + 1;
    if (nuevoIndice >= imagenes.length) nuevoIndice = 0;
    cargarImagen(nuevoIndice);
  };
  
  // Navegación con teclado
  modal.tabIndex = -1;
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      prevButton.click();
    } else if (e.key === 'ArrowRight') {
      nextButton.click();
    } else if (e.key === 'Escape') {
      closeButton.click();
    }
  });
  
  cargarImagen(0);
}

function mostrarModalAtento() {
  let modal = document.getElementById('atento-modal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'atento-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: linear-gradient(135deg, #1a2a6c, #297ce9ff, #fd802dff);
      padding: 30px;
      border-radius: 15px;
      width: 80%;
      max-width: 700px;
      max-height: 80vh;
      overflow-y: auto;
      color: white;
      position: relative;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    `;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = 'X';
    closeButton.style.cssText = `
      position: absolute;
      top: 15px;
      right: 15px;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      color: white;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.3s;
    `;
    
    closeButton.onmouseover = () => {
      closeButton.style.background = 'rgba(255, 255, 255, 0.4)';
    };
    
    closeButton.onmouseout = () => {
      closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
    };
    
    closeButton.onclick = () => {
      modal.style.opacity = '0';
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    };
    
    const title = document.createElement('h2');
    title.textContent = 'Información General de Atento';
    title.style.cssText = `
      margin-top: 0;
      text-align: center;
      font-size: 24px;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    `;
    
    const content = document.createElement('div');
    content.innerHTML = `
      <p style="line-height: 1.6; margin-bottom: 15px;">
        Atento es la empresa líder en soluciones de relación con clientes y negocios de externalización de procesos (BPO) en América Latina.
      </p>
      
      <h3 style="margin-bottom: 10px;">Datos clave:</h3>
      <ul style="line-height: 1.6; margin-bottom: 15px;">
        <li>Fundada en 1999</li>
        <li>Presencia en 13 países</li>
        <li>Más de 400 centros de contacto</li>
        <li>Atiende a más de 400 clientes</li>
        <li>Emplea a más de 140,000 personas</li>
      </ul>
      
      <h3 style="margin-bottom: 10px;">Servicios principales:</h3>
      <ul style="line-height: 1.6; margin-bottom: 15px;">
        <li>Atención al cliente</li>
        <li>Ventas y telemarketing</li>
        <li>Soporte técnico</li>
        <li>Back office y procesamiento de datos</li>
        <li>Soluciones digitales y omnicanal</li>
      </ul>
      
      <p style="text-align: center; margin-top: 20px;">
        <a href="https://atento.com/es/" target="_blank" style="color: #fdbb2d; text-decoration: none; font-weight: bold;">
          Visitar sitio web oficial de Atento
        </a>
      </p>
    `;
    
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(content);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  }
  
  // Mostrar el modal
  modal.style.display = 'flex';
  setTimeout(() => {
    modal.style.opacity = '1';
  }, 10);
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.style.opacity = '0';
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    }
  };
}
function mostrarModalConIframe(url, titulo) {
  // Crear modal con animación de "entrar en pantalla"
  const modal = document.createElement('div');
  modal.className = 'iframe-modal';
  modal.innerHTML = `
    <div class="iframe-modal-content">
      <div class="iframe-modal-header">
        <h3>${titulo}</h3>
        <div class="modal-controls">
          <button class="modal-btn refresh-btn" title="Recargar">↻</button>
          <button class="modal-btn close-btn" title="Cerrar">×</button>
        </div>
      </div>
      <div class="iframe-modal-body">
        <div class="loading-spinner">Cargando...</div>
        <iframe src="${url}" frameborder="0" 
                onload="this.previousElementSibling.style.display='none'"></iframe>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Aplicar estilos CSS para la animación
  const style = document.createElement('style');
  style.textContent = `
    .iframe-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      opacity: 0;
      transition: background 0.5s ease;
    }
    
    .iframe-modal.active {
      background: rgba(0, 0, 0, 0.8);
      opacity: 1;
    }
    
    .iframe-modal-content {
      width: 5px;
      height: 5px;
      background: white;
      border-radius: 50%;
      overflow: hidden;
      position: relative;
      box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0);
      transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    .iframe-modal.active .iframe-modal-content {
      width: 95%;
      height: 95%;
      max-width: 1400px;
      max-height: 90vh;
      border-radius: 15px;
      box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.8);
    }
    
    .iframe-modal-header {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.5s ease 0.3s;
      z-index: 10;
      border-top-left-radius: 15px;
      border-top-right-radius: 15px;
    }
    
    .iframe-modal.active .iframe-modal-header {
      opacity: 1;
      transform: translateY(0);
    }
    
    .iframe-modal-header h3 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 600;
    }
    
    .modal-controls {
      display: flex;
      gap: 10px;
    }
    
    .modal-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }
    
    .modal-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }
    
    .iframe-modal-body {
      width: 100%;
      height: 100%;
      position: relative;
      opacity: 0;
      transition: opacity 0.5s ease 0.5s;
    }
    
    .iframe-modal.active .iframe-modal-body {
      opacity: 1;
    }
    
    .iframe-modal-body iframe {
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 0 0 15px 15px;
    }
    
    .loading-spinner {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #667eea;
      font-size: 1.1rem;
      font-weight: 500;
    }
    
    /* Efecto de brillo durante la animación */
    @keyframes screenGlow {
      0% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7); }
      50% { box-shadow: 0 0 40px 10px rgba(102, 126, 234, 0.4); }
      100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0); }
    }
    
    .iframe-modal-content {
      animation: screenGlow 1s ease-out;
    }
  `;
  document.head.appendChild(style);
  
  // Animación de entrada
  setTimeout(() => {
    modal.classList.add('active');
  }, 10);
  
  // Controles del modal
  const iframe = modal.querySelector('iframe');
  
  modal.querySelector('.close-btn').addEventListener('click', () => {
    cerrarModalConAnimacion(modal);
  });
  
  modal.querySelector('.refresh-btn').addEventListener('click', () => {
    iframe.src = iframe.src;
    modal.querySelector('.loading-spinner').style.display = 'flex';
  });
  
  // Cerrar con ESC
  document.addEventListener('keydown', function closeOnEsc(e) {
    if (e.key === 'Escape') {
      cerrarModalConAnimacion(modal);
      document.removeEventListener('keydown', closeOnEsc);
    }
  });
  
  // Cerrar al hacer click fuera
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      cerrarModalConAnimacion(modal);
    }
  });
}

function cerrarModalConAnimacion(modal) {
  const modalContent = modal.querySelector('.iframe-modal-content');
  
  // Revertir a círculo pequeño
  modalContent.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
  modalContent.style.width = '5px';
  modalContent.style.height = '5px';
  modalContent.style.borderRadius = '50%';
  modalContent.style.boxShadow = '0 0 0 1000px rgba(0, 0, 0, 0)';
  
  // Ocultar header y body
  modal.querySelector('.iframe-modal-header').style.opacity = '0';
  modal.querySelector('.iframe-modal-body').style.opacity = '0';
  
  modal.classList.remove('active');
  
  setTimeout(() => {
    modal.style.background = 'rgba(0, 0, 0, 0)';
    setTimeout(() => {
      modal.remove();
      // Remover estilos también
      const styles = document.querySelectorAll('style');
      styles.forEach(style => {
        if (style.textContent.includes('iframe-modal')) {
          style.remove();
        }
      });
    }, 500);
  }, 400);
}
function mostrarModalDesarrollo() {
  // Crear el modal si no existe
  let modal = document.getElementById('desarrollo-modal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'desarrollo-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: linear-gradient(135deg, #2d3748, #4a5568, #2d3748);
      padding: 30px;
      border-radius: 15px;
      width: 80%;
      max-width: 700px;
      max-height: 80vh;
      overflow-y: auto;
      color: white;
      position: relative;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    `;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = 'X';
    closeButton.style.cssText = `
      position: absolute;
      top: 15px;
      right: 15px;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      color: white;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.3s;
    `;
    
    closeButton.onmouseover = () => {
      closeButton.style.background = 'rgba(255, 255, 255, 0.4)';
    };
    
    closeButton.onmouseout = () => {
      closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
    };
    
    closeButton.onclick = () => {
      modal.style.opacity = '0';
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    };
    
    const title = document.createElement('h2');
    title.textContent = 'Sala de Desarrollo & Capacitación';
    title.style.cssText = `
      margin-top: 0;
      text-align: center;
      font-size: 24px;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
      color: #63b3ed;
    `;
    
    const content = document.createElement('div');
    content.innerHTML = `
      <p style="line-height: 1.6; margin-bottom: 15px; text-align: center; font-style: italic;">
        Espacio dedicado a la innovación en formación y desarrollo del talento humano
      </p>
      
      <h3 style="margin-bottom: 10px; color: #68d391; border-bottom: 2px solid #68d391; padding-bottom: 5px;">🎯 Cursos Gamificados</h3>
      <p style="line-height: 1.6; margin-bottom: 15px;">
        Desarrollamos experiencias de aprendizaje interactivas mediante mecánicas de juego que:
      </p>
      <ul style="line-height: 1.6; margin-bottom: 15px;">
        <li>Aumentan la engagement y retención del conocimiento</li>
        <li>Implementan sistemas de recompensas y logros</li>
        <li>Permiten seguimiento personalizado del progreso</li>
        <li>Fomentan la competencia saludable entre colaboradores</li>
      </ul>
      
      <h3 style="margin-bottom: 10px; color: #68d391; border-bottom: 2px solid #68d391; padding-bottom: 5px;">🔄 Simuladores Especializados</h3>
      <p style="line-height: 1.6; margin-bottom: 15px;">
        Creamos entornos virtuales para practicar habilidades en situaciones realistas:
      </p>
      <ul style="line-height: 1.6; margin-bottom: 15px;">
        <li>Atención al cliente en diversos escenarios</li>
        <li>Manejo de objeciones y situaciones complejas</li>
        <li>Procesos operativos específicos por área</li>
        <li>Simulaciones de ventas y telemarketing</li>
      </ul>
      
      <h3 style="margin-bottom: 10px; color: #68d391; border-bottom: 2px solid #68d391; padding-bottom: 5px;">📊 Planificación de Capacitaciones</h3>
      <p style="line-height: 1.6; margin-bottom: 15px;">
        Diseñamos programas de formación continua adaptados a las necesidades de:
      </p>
      <ul style="line-height: 1.6; margin-bottom: 20px;">
        <li><strong>Nuevos ingresos:</strong> Programas de onboarding acelerado</li>
        <li><strong>Desarrollo vertical:</strong> Capacitación para ascensos y nuevos roles</li>
        <li><strong>Actualización técnica:</strong> Formación en nuevas tecnologías y procesos</li>
        <li><strong>Habilidades blandas:</strong> Comunicación, liderazgo y trabajo en equipo</li>
      </ul>
      
      <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 10px; border-left: 4px solid #63b3ed;">
        <h4 style="margin: 0 0 10px 0; color: #63b3ed;">💡 Metodología de Trabajo</h4>
        <p style="margin: 0; line-height: 1.5;">
          Utilizamos enfoques <strong>ágiles</strong> y <strong>centrados en el usuario</strong>, con iteraciones 
          rápidas y feedback continuo para asegurar que cada solución de formación cumpla 
          con los objetivos de negocio y las expectativas de los colaboradores.
        </p>
      </div>
    `;
    
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(content);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  }
  
  // Mostrar el modal
  modal.style.display = 'flex';
  setTimeout(() => {
    modal.style.opacity = '1';
  }, 10);
  
  // Cerrar modal al hacer clic fuera del contenido
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.style.opacity = '0';
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    }
  };
}


export function checkHotspotInteraction(model, keys) {
  if (!model || !interactableHotspots.length) return;

  let isNearHotspot = false;
  const playerPos = model.position.clone();
  const tiempo = performance.now() * 0.001;

  interactableHotspots.forEach(hotspot => {
    const distance = playerPos.distanceTo(hotspot.userData.position);
    const isClose = distance < 1.3;
    const tamaño = hotspot.userData.size;
    const scaleFactor = 1 + 0.1 * Math.sin(tiempo * 3);
    const pulseIntensity = isClose ? 1.5 + 0.5 * Math.sin(tiempo * 3) : 0.3;

    hotspot.userData.icon.scale.setScalar(scaleFactor);
    hotspot.userData.icon.material.emissiveIntensity = pulseIntensity;
    hotspot.userData.icon.rotation.y = tiempo * 0.3;
    const targetOpacity = isClose ? 0.9 : 0;
    hotspot.userData.icon.material.opacity = THREE.MathUtils.lerp(
      hotspot.userData.icon.material.opacity,
      targetOpacity,
      0.1
    );
    if (hotspot.userData.particles) {
      hotspot.userData.particles.children.forEach((particle, i) => {
        const angle = tiempo * 1.2 + (i / hotspot.userData.particles.children.length) * Math.PI * 2;
        const radius = tamaño * 1.5 * (1 + 0.05 * Math.sin(tiempo * 2 + i));
        particle.position.x = Math.cos(angle) * radius;
        particle.position.z = Math.sin(angle) * radius;
        particle.position.y = Math.sin(tiempo * 0.1 + i) * 0.05;
        particle.material.opacity = 1.0;
      });
    }

    const targetY = isClose ? 0.3 + Math.sin(tiempo * 0.5) * 0.08 : 0.3;
    hotspot.userData.icon.position.y = hotspot.userData.position.y + targetY;

    if (isClose) isNearHotspot = true;

    if (isClose && !wasClose && hoverSound) {
      const audio = new THREE.Audio(new THREE.AudioListener());
      audio.setBuffer(hoverSound);
      audio.play();
    }

    if (isClose && keys['e']) {
      hotspot.userData.action();
      keys['e'] = false;
    }
  });

  wasClose = isNearHotspot;

  if (isNearHotspot !== showInteractHint) {
    showInteractHint = isNearHotspot;
    updateInteractHint(showInteractHint);
  }
}

function updateInteractHint(show) {
  const hintElement = document.getElementById('interact-hint');
  
  if (show && !hintElement) {
    const hint = document.createElement('div');
    hint.id = 'interact-hint';
    
    hint.innerHTML = `
      <style>
        .interaction-hint-container {
          position: fixed;
          bottom: 60px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
        }

        .interaction-hint {
          background: linear-gradient(145deg, rgba(20, 20, 30, 0.95), rgba(10, 10, 20, 0.95));
          padding: 14px 24px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 16px;
          color: white;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.4s cubic-bezier(0.2, 0.8, 0.4, 1);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .interaction-hint.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          animation: pulse 2.5s infinite;
        }

        .interaction-icon {
          width: 42px;
          height: 42px;
          background: linear-gradient(135deg, rgba(70, 25, 255, 1) 0%, #8b61ffff 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          box-shadow: 0 4px 12px rgba(70, 25, 255, 0.4);
          transition: all 0.3s ease;
          font-size: 18px;
        }

        .interaction-hint:hover .interaction-icon {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(70, 25, 255, 0.6);
        }

        .interaction-content {
          display: flex;
          flex-direction: column;
        }

        .interaction-text {
          font-weight: 600;
          letter-spacing: 0.3px;
          background: linear-gradient(90deg, #FFFFFF, #E0E0FF);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          font-size: 16px;
        }

        .interaction-subtext {
          font-size: 13px;
          opacity: 0.8;
          font-weight: 400;
          margin-top: 2px;
          color: rgba(255, 255, 255, 0.7);
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(71, 25, 255, 0.8); }
          70% { box-shadow: 0 0 0 10px rgba(70, 25, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(70, 25, 255, 0); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      </style>
      
      <div class="interaction-hint-container">
        <div class="interaction-hint visible">
          <div class="interaction-icon">E</div>
          <div class="interaction-content">
            <span class="interaction-text">Objeto interactivo</span>
            <span class="interaction-subtext">Presiona "E" para continuar</span>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(hint);
  } else if (!show && hintElement) {
    const hintContent = hintElement.querySelector('.interaction-hint');
    if (hintContent) {
      hintContent.classList.remove('visible');
      setTimeout(() => {
        hintElement.remove();
      }, 400);
    }
  }
}
