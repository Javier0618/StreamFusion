document.addEventListener("DOMContentLoaded", () => {
  // Elementos del DOM
  const searchBtn = document.getElementById("searchBtn")
  const contentIdInput = document.getElementById("contentId")
  const contentContainer = document.getElementById("contentContainer")
  const recentSearchesContainer = document.getElementById("recentSearches")
  const pageLoader = document.getElementById("pageLoader")
  const reportBtn = document.getElementById("reportBtn")

  // Declaración de variables API y templates
  const API_BASE_URL = "https://api.themoviedb.org/3"
  const API_KEY = "YOUR_API_KEY" // Reemplaza con tu API key
  const MOVIE_TEMPLATE = "movie.html"
  const TV_TEMPLATE = "tv.html"
  const MAX_RECENT_SEARCHES = 5

  // Cargar búsquedas recientes
  loadRecentSearches()

  // Event listeners
  searchBtn.addEventListener("click", handleSearch)
  contentIdInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  })
  reportBtn.addEventListener("click", handleReport)

  // Función para manejar la búsqueda
  async function handleSearch() {
    const contentId = contentIdInput.value.trim()

    if (!contentId) {
      showError("Por favor, ingresa un ID válido.")
      return
    }

    if (!/^\d+$/.test(contentId)) {
      showError("El ID debe ser un número.")
      return
    }

    showLoader()

    try {
      // Intentar determinar si es película o serie
      const contentType = await determineContentType(contentId)

      if (contentType) {
        // Guardar en búsquedas recientes
        saveRecentSearch(contentId, contentType)

        // Cargar la plantilla correspondiente
        loadContentTemplate(contentId, contentType)
      } else {
        showError("No se encontró contenido con ese ID.")
      }
    } catch (error) {
      console.error("Error al buscar contenido:", error)
      showError("Ocurrió un error al buscar el contenido. Por favor, intenta de nuevo.")
    } finally {
      hideLoader()
    }
  }

  // Función para determinar si el ID corresponde a una película o serie
  async function determineContentType(id) {
    try {
      // Intentar como película
      const movieResponse = await fetch(`${API_BASE_URL}/movie/${id}?api_key=${API_KEY}&language=es-ES`)
      if (movieResponse.ok) {
        return "movie"
      }

      // Intentar como serie
      const tvResponse = await fetch(`${API_BASE_URL}/tv/${id}?api_key=${API_KEY}&language=es-ES`)
      if (tvResponse.ok) {
        return "tv"
      }

      return null
    } catch (error) {
      console.error("Error al determinar el tipo de contenido:", error)
      return null
    }
  }

  // Función para cargar la plantilla correspondiente
  function loadContentTemplate(id, type) {
    const templateUrl = type === "movie" ? MOVIE_TEMPLATE : TV_TEMPLATE

    // Crear un iframe para cargar la plantilla
    const iframe = document.createElement("iframe")
    iframe.src = `${templateUrl}?id=${id}`
    iframe.title = "Contenido"
    iframe.allowFullscreen = true

    // Limpiar el contenedor y agregar el iframe
    contentContainer.innerHTML = ""
    contentContainer.appendChild(iframe)
  }

  // Función para guardar búsqueda reciente
  function saveRecentSearch(id, type) {
    let recentSearches = JSON.parse(localStorage.getItem("recentSearches") || "[]")

    // Verificar si ya existe
    const existingIndex = recentSearches.findIndex((item) => item.id === id)
    if (existingIndex !== -1) {
      // Mover al principio
      recentSearches.splice(existingIndex, 1)
    }

    // Agregar al principio
    recentSearches.unshift({
      id,
      type,
      timestamp: Date.now(),
    })

    // Limitar a MAX_RECENT_SEARCHES
    if (recentSearches.length > MAX_RECENT_SEARCHES) {
      recentSearches = recentSearches.slice(0, MAX_RECENT_SEARCHES)
    }

    // Guardar en localStorage
    localStorage.setItem("recentSearches", JSON.stringify(recentSearches))

    // Actualizar UI
    loadRecentSearches()
  }

  // Función para cargar búsquedas recientes
  function loadRecentSearches() {
    const recentSearches = JSON.parse(localStorage.getItem("recentSearches") || "[]")

    if (recentSearches.length === 0) {
      recentSearchesContainer.innerHTML = "<p>No hay búsquedas recientes</p>"
      return
    }

    recentSearchesContainer.innerHTML = ""

    recentSearches.forEach((search) => {
      const item = document.createElement("div")
      item.className = "recent-item"

      const icon = search.type === "movie" ? "fa-film" : "fa-tv"

      item.innerHTML = `
                <i class="fas ${icon} recent-item-icon"></i>
                <span>${search.id}</span>
            `

      item.addEventListener("click", () => {
        contentIdInput.value = search.id
        handleSearch()
      })

      recentSearchesContainer.appendChild(item)
    })
  }

  // Función para mostrar error
  function showError(message) {
    const errorElement = document.createElement("div")
    errorElement.className = "error-message"
    errorElement.textContent = message

    contentContainer.innerHTML = ""
    contentContainer.appendChild(errorElement)
  }

  // Función para manejar el reporte
  function handleReport() {
    alert("Funcionalidad de reporte no implementada en esta versión.")
  }

  // Funciones para mostrar/ocultar el loader
  function showLoader() {
    pageLoader.classList.remove("hidden")
  }

  function hideLoader() {
    pageLoader.classList.add("hidden")
  }

  // Ocultar el loader inicial
  hideLoader()
})

