document.addEventListener("DOMContentLoaded", () => {
  // Declarar las variables API_BASE_URL, API_KEY e IMG_BASE_URL
  const API_BASE_URL = "https://api.themoviedb.org/3"
  const API_KEY = "32e5e53999e380a0291d66fb304153fe" // Reemplaza con tu API key real
  const IMG_BASE_URL = "https://image.tmdb.org/t/p"

  // Obtener el ID de la serie de la URL
  const urlParams = new URLSearchParams(window.location.search)
  const seriesId = urlParams.get("id")

  if (!seriesId) {
    showError("ID de serie no proporcionado")
    return
  }

  // Elementos del DOM
  const pageLoader = document.getElementById("pageLoader")
  const seriesPoster = document.getElementById("seriesPoster")
  const seriesTitle = document.getElementById("seriesTitle")
  const seriesFirstAirDate = document.getElementById("seriesFirstAirDate")
  const seriesGenres = document.getElementById("seriesGenres")
  const seriesCreators = document.getElementById("seriesCreators")
  const seriesActors = document.getElementById("seriesActors")
  const seriesOverview = document.getElementById("seriesOverview")
  const videoPlayer = document.getElementById("videoPlayer")
  const reloadButton = document.getElementById("reloadButton")
  const seasonDropdown = document.getElementById("seasonDropdown")
  const episodesSlider = document.getElementById("episodesSlider")
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
      // Cargar datos de la serie y contenido relacionado en paralelo
      const [seriesData, relatedSeries] = await Promise.all([fetchSeriesData(seriesId), fetchRelatedSeries(seriesId)])

      // Cargar el reproductor de video
      loadVideo(`https://unlimplayer.top/embed/ovef0zibudjirg5?id=${seriesId}`)

      // Ocultar el loader
      hideLoader()
    } catch (error) {
      console.error("Error al inicializar la página:", error)
      showError("Error al cargar la información de la serie")
      hideLoader()
    }
  }

  // Función para cargar datos de la serie
  async function fetchSeriesData(id) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/tv/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`,
      )

      if (!response.ok) {
        throw new Error(`Error al obtener datos de la serie: ${response.status}`)
      }

      const data = await response.json()

      // Actualizar la UI con los datos de la serie
      updateSeriesUI(data)

      return data
    } catch (error) {
      console.error("Error al cargar datos de la serie:", error)
      throw error
    }
  }

  // Función para actualizar la UI con los datos de la serie
  function updateSeriesUI(data) {
    // Actualizar título
    document.title = `StreamFusion - ${data.name || "Serie"}`
    seriesTitle.innerText = data.name || "Título no disponible"

    // Actualizar fecha de estreno
    seriesFirstAirDate.innerText = `Año de estreno: ${data.first_air_date ? new Date(data.first_air_date).getFullYear() : "No disponible"}`

    // Actualizar géneros
    seriesGenres.innerText = `Géneros: ${data.genres && data.genres.length > 0 ? data.genres.map((genre) => genre.name).join(", ") : "No disponible"}`

    // Actualizar creadores
    const creators =
      data.created_by && data.created_by.length > 0
        ? data.created_by.map((creator) => creator.name).join(", ")
        : "No disponible"
    seriesCreators.innerText = `Creadores: ${creators}`

    // Actualizar actores
    const actors =
      data.credits && data.credits.cast && data.credits.cast.length > 0
        ? data.credits.cast
            .slice(0, 5)
            .map((actor) => actor.name)
            .join(", ")
        : "No disponible"
    seriesActors.innerText = `Actores principales: ${actors}`

    // Actualizar póster
    if (data.poster_path) {
      const posterUrl = `${IMG_BASE_URL}/w500${data.poster_path}`
      seriesPoster.onload = () => {
        adjustDetailsHeight()
      }
      seriesPoster.onerror = function () {
        handleImageError(this)
      }
      seriesPoster.src = posterUrl
    } else {
      handleImageError(seriesPoster)
    }

    // Actualizar sinopsis
    seriesOverview.innerText = data.overview || "Descripción no disponible"

    // Poblar el dropdown de temporadas
    populateSeasonsDropdown(data.seasons)

    // Ajustar altura de detalles
    adjustDetailsHeight()
  }

  // Función para poblar el dropdown de temporadas
  function populateSeasonsDropdown(seasons) {
    seasonDropdown.innerHTML = "" // Limpiar opciones existentes

    if (!seasons || seasons.length === 0) {
      const option = document.createElement("option")
      option.value = ""
      option.textContent = "No hay temporadas disponibles"
      seasonDropdown.appendChild(option)
      return
    }

    seasons.forEach((season) => {
      if (season.season_number >= 1) {
        const option = document.createElement("option")
        option.value = season.season_number
        option.textContent = `Temporada ${season.season_number}`
        seasonDropdown.appendChild(option)
      }
    })

    seasonDropdown.addEventListener("change", (event) => {
      const seasonNumber = event.target.value
      fetchSeasonEpisodes(seasonNumber)
    })

    // Cargar episodios de la primera temporada por defecto
    if (seasons.length > 0) {
      const firstSeason = seasons.find((season) => season.season_number >= 1)
      if (firstSeason) {
        fetchSeasonEpisodes(firstSeason.season_number)
      }
    }
  }

  // Función para cargar episodios de una temporada
  async function fetchSeasonEpisodes(seasonNumber) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/tv/${seriesId}/season/${seasonNumber}?api_key=${API_KEY}&language=es-ES`,
      )

      if (!response.ok) {
        throw new Error(`Error al obtener episodios: ${response.status}`)
      }

      const data = await response.json()
      renderEpisodes(data.episodes || [])
    } catch (error) {
      console.error("Error al cargar episodios:", error)
      episodesSlider.innerHTML = "<p>Error al cargar episodios</p>"
    }
  }

  // Función para renderizar episodios
  function renderEpisodes(episodes) {
    episodesSlider.innerHTML = ""

    if (episodes.length === 0) {
      episodesSlider.innerHTML = "<p>No hay episodios disponibles</p>"
      return
    }

    episodes.forEach((episode, index) => {
      const slideItem = document.createElement("div")
      slideItem.className = "episode"
      slideItem.textContent = episode.episode_number
      slideItem.dataset.videoUrl = `https://unlimplayer.top/embed/ovef0zibudjirg5?id=${seriesId}&s=${episode.season_number}&e=${episode.episode_number}`

      slideItem.addEventListener("click", () => {
        const allEpisodes = document.querySelectorAll(".episode")
        allEpisodes.forEach((ep) => ep.classList.remove("selected"))
        slideItem.classList.add("selected")
        loadVideo(slideItem.dataset.videoUrl)
      })

      episodesSlider.appendChild(slideItem)

      // Seleccionar el primer episodio por defecto
      if (index === 0) {
        slideItem.classList.add("selected")
        // Pequeño timeout para asegurar que el DOM esté listo
        setTimeout(() => {
          loadVideo(slideItem.dataset.videoUrl)
        }, 100)
      }
    })
  }

  // Función para cargar series relacionadas
  async function fetchRelatedSeries(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/tv/${id}/recommendations?api_key=${API_KEY}&language=es-ES`)

      if (!response.ok) {
        throw new Error(`Error al obtener series relacionadas: ${response.status}`)
      }

      const data = await response.json()

      // Si no hay recomendaciones, intentar con series similares
      if (!data.results || data.results.length === 0) {
        const similarResponse = await fetch(`${API_BASE_URL}/tv/${id}/similar?api_key=${API_KEY}&language=es-ES`)

        if (!similarResponse.ok) {
          throw new Error(`Error al obtener series similares: ${similarResponse.status}`)
        }

        const similarData = await similarResponse.json()
        renderRelatedSeries(similarData.results || [])
        return similarData.results || []
      }

      renderRelatedSeries(data.results || [])
      return data.results || []
    } catch (error) {
      console.error("Error al cargar series relacionadas:", error)
      renderRelatedSeries([])
      return []
    }
  }

  // Función para renderizar series relacionadas
  function renderRelatedSeries(series) {
    // Ocultar loaders
    relatedLoader.style.display = "none"
    relatedLoader2.style.display = "none"

    if (series.length === 0) {
      relatedContent.innerHTML = "<p>No hay series relacionadas disponibles</p>"
      relatedContent2.innerHTML = "<p>No hay series relacionadas disponibles</p>"
      return
    }

    // Limpiar contenedores
    relatedContent.innerHTML = ""
    relatedContent2.innerHTML = ""

    // Renderizar series (máximo 6 para móvil y 12 para desktop)
    const mobileSeries = series.slice(0, 6)
    const desktopSeries = series.slice(0, 12)

    // Renderizar para móvil
    mobileSeries.forEach((serie) => {
      const div = document.createElement("div")
      div.className = "item"

      const posterPath = serie.poster_path
      const posterUrl = posterPath ? `${IMG_BASE_URL}/w500${posterPath}` : null

      div.innerHTML = `
                <a href="?id=${serie.id}" target="_self">
                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzJDMkMyQyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiNkZWRlZGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPkNhcmdhbmRvLi4uPC90ZXh0Pjwvc3ZnPg==" 
                        data-src="${posterUrl}" 
                        alt="${serie.name}" 
                        loading="lazy">
                    <div class="item-rating">⭐ ${serie.vote_average ? serie.vote_average.toFixed(1) : "N/A"}</div>
                    <div class="item-title">${serie.name}</div>                        
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
    desktopSeries.forEach((serie) => {
      const div = document.createElement("div")
      div.className = "item"

      const posterPath = serie.poster_path
      const posterUrl = posterPath ? `${IMG_BASE_URL}/w500${posterPath}` : null

      div.innerHTML = `
                <a href="?id=${serie.id}" target="_self">
                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzJDMkMyQyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiNkZWRlZGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPkNhcmdhbmRvLi4uPC90ZXh0Pjwvc3ZnPg==" 
                        data-src="${posterUrl}" 
                        alt="${serie.name}" 
                        loading="lazy">
                    <div class="item-rating">⭐ ${serie.vote_average ? serie.vote_average.toFixed(1) : "N/A"}</div>
                    <div class="item-title">${serie.name}</div>                        
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
    const poster = document.getElementById("seriesPoster")
    const details = document.querySelector(".series-details")

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

