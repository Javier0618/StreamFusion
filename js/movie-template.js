document.addEventListener("DOMContentLoaded", () => {
  // Declarar las variables API_BASE_URL, API_KEY e IMG_BASE_URL
  const API_BASE_URL = "https://api.themoviedb.org/3"
  const API_KEY = "YOUR_API_KEY" // Reemplaza con tu API key de TMDb
  const IMG_BASE_URL = "https://image.tmdb.org/t/p"

  // Obtener el ID de la película de la URL
  const urlParams = new URLSearchParams(window.location.search)
  const movieId = urlParams.get("id")

  if (!movieId) {
    showError("ID de película no proporcionado")
    return
  }

  // Elementos del DOM
  const pageLoader = document.getElementById("pageLoader")
  const moviePoster = document.getElementById("moviePoster")
  const movieTitle = document.getElementById("movieTitle")
  const movieReleaseDate = document.getElementById("movieReleaseDate")
  const movieGenres = document.getElementById("movieGenres")
  const movieDirector = document.getElementById("movieDirector")
  const movieActors = document.getElementById("movieActors")
  const movieOverview = document.getElementById("movieOverview")
  const videoPlayer = document.getElementById("videoPlayer")
  const reloadButton = document.getElementById("reloadButton")
  const relatedContent = document.getElementById("relatedContent")
  const relatedContent2 = document.getElementById("relatedContent2")
  const relatedLoader = document.getElementById("relatedLoader")
  const relatedLoader2 = document.getElementById("relatedLoader2")

  // Variables de estado
  let currentVideoUrl = ""
  let retryCount = 0
  const MAX_RETRIES = 3

  // Inicializar la página
  initPage()

  // Event listeners
  reloadButton.addEventListener("click", reloadCurrentVideo)

  // Función principal de inicialización
  async function initPage() {
    try {
      // Cargar datos de la película y contenido relacionado en paralelo
      const [movieData, relatedMovies] = await Promise.all([fetchMovieData(movieId), fetchRelatedMovies(movieId)])

      // Cargar el reproductor de video
      loadVideo(`https://unlimplayer.top/embed/ovef0zibudjirg5?id=${movieId}`)

      // Ocultar el loader
      hideLoader()
    } catch (error) {
      console.error("Error al inicializar la página:", error)
      showError("Error al cargar la información de la película")
      hideLoader()
    }
  }

  // Función para cargar datos de la película
  async function fetchMovieData(id) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/movie/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`,
      )

      if (!response.ok) {
        throw new Error(`Error al obtener datos de película: ${response.status}`)
      }

      const data = await response.json()

      // Actualizar la UI con los datos de la película
      updateMovieUI(data)

      return data
    } catch (error) {
      console.error("Error al cargar datos de la película:", error)
      throw error
    }
  }

  // Función para actualizar la UI con los datos de la película
  function updateMovieUI(data) {
    // Actualizar título
    document.title = `StreamFusion - ${data.title || "Película"}`
    movieTitle.innerText = data.title || "Título no disponible"

    // Actualizar fecha de lanzamiento
    movieReleaseDate.innerText = `Año: ${data.release_date ? new Date(data.release_date).getFullYear() : "No disponible"}`

    // Actualizar géneros
    movieGenres.innerText = `Categorías: ${data.genres && data.genres.length > 0 ? data.genres.map((genre) => genre.name).join(", ") : "No disponible"}`

    // Actualizar director
    const director =
      data.credits && data.credits.crew
        ? data.credits.crew.find((crewMember) => crewMember.job === "Director")?.name || "No disponible"
        : "No disponible"
    movieDirector.innerText = `Director: ${director}`

    // Actualizar actores
    const actors =
      data.credits && data.credits.cast && data.credits.cast.length > 0
        ? data.credits.cast
            .slice(0, 5)
            .map((actor) => actor.name)
            .join(", ")
        : "No disponible"
    movieActors.innerText = `Actores principales: ${actors}`

    // Actualizar póster
    if (data.poster_path) {
      const posterUrl = `${IMG_BASE_URL}/w500${data.poster_path}`
      moviePoster.onload = () => {
        adjustDetailsHeight()
      }
      moviePoster.onerror = function () {
        handleImageError(this)
      }
      moviePoster.src = posterUrl
    } else {
      handleImageError(moviePoster)
    }

    // Actualizar sinopsis
    movieOverview.innerText = data.overview || "Descripción no disponible"

    // Ajustar altura de detalles
    adjustDetailsHeight()
  }

  // Función para cargar películas relacionadas
  async function fetchRelatedMovies(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/movie/${id}/recommendations?api_key=${API_KEY}&language=es-ES`)

      if (!response.ok) {
        throw new Error(`Error al obtener películas relacionadas: ${response.status}`)
      }

      const data = await response.json()

      // Si no hay recomendaciones, intentar con películas similares
      if (!data.results || data.results.length === 0) {
        const similarResponse = await fetch(`${API_BASE_URL}/movie/${id}/similar?api_key=${API_KEY}&language=es-ES`)

        if (!similarResponse.ok) {
          throw new Error(`Error al obtener películas similares: ${similarResponse.status}`)
        }

        const similarData = await similarResponse.json()
        renderRelatedMovies(similarData.results || [])
        return similarData.results || []
      }

      renderRelatedMovies(data.results || [])
      return data.results || []
    } catch (error) {
      console.error("Error al cargar películas relacionadas:", error)
      renderRelatedMovies([])
      return []
    }
  }

  // Función para renderizar películas relacionadas
  function renderRelatedMovies(movies) {
    // Ocultar loaders
    relatedLoader.style.display = "none"
    relatedLoader2.style.display = "none"

    if (movies.length === 0) {
      relatedContent.innerHTML = "<p>No hay películas relacionadas disponibles</p>"
      relatedContent2.innerHTML = "<p>No hay películas relacionadas disponibles</p>"
      return
    }

    // Limpiar contenedores
    relatedContent.innerHTML = ""
    relatedContent2.innerHTML = ""

    // Renderizar películas (máximo 6 para móvil y 12 para desktop)
    const mobileMovies = movies.slice(0, 6)
    const desktopMovies = movies.slice(0, 12)

    // Renderizar para móvil
    mobileMovies.forEach((movie) => {
      const div = document.createElement("div")
      div.className = "item"

      const posterPath = movie.poster_path
      const posterUrl = posterPath ? `${IMG_BASE_URL}/w500${posterPath}` : null

      div.innerHTML = `
                <a href="?id=${movie.id}" target="_self">
                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzJDMkMyQyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiNkZWRlZGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPkNhcmdhbmRvLi4uPC90ZXh0Pjwvc3ZnPg==" 
                        data-src="${posterUrl}" 
                        alt="${movie.title}" 
                        loading="lazy">
                    <div class="item-rating">⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : "N/A"}</div>
                    <div class="item-title">${movie.title}</div>                        
                </a>
            `
      relatedContent.appendChild(div)

      // Cargar la imagen real después de añadir al DOM
      const img = div.querySelector("img")
      if (posterUrl) {
        const actualImg = new Image()
        actualImg.onload = () => {
          img.src = posterUrl
        }
        actualImg.onerror = () => {
          handleImageError(img)
        }
        actualImg.src = posterUrl
      } else {
        handleImageError(img)
      }
    })

    // Renderizar para desktop
    desktopMovies.forEach((movie) => {
      const div = document.createElement("div")
      div.className = "item"

      const posterPath = movie.poster_path
      const posterUrl = posterPath ? `${IMG_BASE_URL}/w500${posterPath}` : null

      div.innerHTML = `
                <a href="?id=${movie.id}" target="_self">
                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzJDMkMyQyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiNkZWRlZGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPkNhcmdhbmRvLi4uPC90ZXh0Pjwvc3ZnPg==" 
                        data-src="${posterUrl}" 
                        alt="${movie.title}" 
                        loading="lazy">
                    <div class="item-rating">⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : "N/A"}</div>
                    <div class="item-title">${movie.title}</div>                        
                </a>
            `
      relatedContent2.appendChild(div)

      // Cargar la imagen real después de añadir al DOM
      const img = div.querySelector("img")
      if (posterUrl) {
        const actualImg = new Image()
        actualImg.onload = () => {
          img.src = posterUrl
        }
        actualImg.onerror = () => {
          handleImageError(img)
        }
        actualImg.src = posterUrl
      } else {
        handleImageError(img)
      }
    })

    // Iniciar carga diferida de imágenes
    loadLazyImages()
  }

  // Función para cargar el video
  function loadVideo(videoUrl) {
    return new Promise((resolve, reject) => {
      currentVideoUrl = videoUrl
      const iframe = document.getElementById("videoPlayer")

      iframe.onload = () => {
        console.log("Video cargado correctamente")
        resolve()
      }

      iframe.onerror = () => {
        console.error("Error al cargar el video")
        if (retryCount < MAX_RETRIES) {
          retryCount++
          console.log(`Reintentando cargar video (${retryCount}/${MAX_RETRIES})...`)
          setTimeout(() => {
            iframe.src = "about:blank"
            setTimeout(() => {
              iframe.src = videoUrl
            }, 500)
          }, 1000)
        } else {
          reject(new Error("No se pudo cargar el video después de varios intentos"))
        }
      }

      iframe.src = videoUrl

      // Establecer un tiempo máximo de espera
      setTimeout(() => {
        console.log("Tiempo de carga del video excedido, continuando con la interfaz")
        resolve()
      }, 10000)
    })
  }

  // Función para recargar el video actual
  function reloadCurrentVideo() {
    const reloadButton = document.getElementById("reloadButton")
    reloadButton.classList.add("loading")

    const iframe = document.getElementById("videoPlayer")
    iframe.src = "about:blank"

    setTimeout(() => {
      iframe.src = currentVideoUrl
      setTimeout(() => {
        reloadButton.classList.remove("loading")
      }, 1000)
    }, 1000)
  }

  // Función para cargar imágenes diferidas
  function loadLazyImages() {
    const lazyImages = document.querySelectorAll("img[data-src]")
    lazyImages.forEach((img) => {
      if (img.dataset.src) {
        const actualImg = new Image()
        actualImg.onload = () => {
          img.src = img.dataset.src
          img.removeAttribute("data-src")
        }
        actualImg.onerror = () => {
          handleImageError(img)
          img.removeAttribute("data-src")
        }
        actualImg.src = img.dataset.src
      }
    })
  }

  // Función para manejar errores de carga de imágenes
  function handleImageError(img, fallbackUrl) {
    img.onerror = null
    if (fallbackUrl) {
      img.src = fallbackUrl
    } else {
      const svgFallback = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzJDMkMyQyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiNkZWRlZGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==`
      img.src = svgFallback
    }
  }

  // Función para ajustar la altura de los detalles
  function adjustDetailsHeight() {
    const poster = document.getElementById("moviePoster")
    const details = document.querySelector(".movie-details")

    if (poster && details && poster.complete) {
      details.style.height = `${poster.clientHeight}px`
    }
  }

  // Función para mostrar error
  function showError(message) {
    const errorElement = document.createElement("div")
    errorElement.className = "error-message"
    errorElement.textContent = message

    document.body.innerHTML = ""
    document.body.appendChild(errorElement)
  }

  // Funciones para mostrar/ocultar el loader
  function showLoader() {
    pageLoader.classList.remove("hidden")
  }

  function hideLoader() {
    pageLoader.classList.add("hidden")
  }

  // Event listeners para ajustes de tamaño
  window.addEventListener("resize", adjustDetailsHeight)

  // Manejar errores globales
  window.addEventListener("error", (e) => {
    console.error("Error global capturado:", e.message)
  })
})

