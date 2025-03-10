const VALID_SORTS = [
  "vehicles",
  "spoilers",
  "rims",
  "body-colors",
  "textures",
  "tire-stickers",
  "tire-styles",
  "drifts",
  "hyperchromes",
  "furnitures",
  "limited-items",
  "horns",
];
function formatTimeAgo(timestamp) {
  if (!timestamp) return null;

  // Check and convert timestamp format
  const timestampInMs =
    timestamp.toString().length > 10
      ? timestamp // Already in milliseconds
      : timestamp * 1000; // Convert seconds to milliseconds

  const now = Date.now();
  const diff = now - timestampInMs;

  // Time intervals in milliseconds
  const intervals = {
    year: 31536000000,
    month: 2592000000,
    week: 604800000,
    day: 86400000,
    hour: 3600000,
    minute: 60000,
  };

  // Only show "just now" if less than a minute ago
  if (diff < 60000) return "just now";

  // Calculate the appropriate time interval
  for (const [unit, ms] of Object.entries(intervals)) {
    const interval = Math.floor(diff / ms);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? "" : "s"} ago`;
    }
  }

  return null;
}

// Global debounce function
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function showLoadingOverlay() {
  document.querySelector("#loading-overlay").classList.add("show");
}

function hideLoadingOverlay() {
  document.querySelector("#loading-overlay").classList.remove("show");
}

// Global shareCurrentView function
window.shareCurrentView = debounce(function () {
  const sortDropdown = document.getElementById("sort-dropdown");
  const valueSortDropdown = document.getElementById("value-sort-dropdown");
  const searchBar = document.getElementById("search-bar");

  // Build URL parameters - This was missing
  const params = new URLSearchParams();
  if (sortDropdown.value !== "name-all-items") {
    params.append("sort", sortDropdown.value.split("-").slice(1).join("-"));
  }
  if (valueSortDropdown.value !== "random") {
    params.append("valueSort", valueSortDropdown.value);
  }
  if (searchBar.value.trim()) {
    params.append("search", searchBar.value.trim());
  }

  // Construct full URL
  const baseUrl = `${window.location.origin}/values`;
  const shareUrl = params.toString()
    ? `${baseUrl}?${params.toString()}`
    : baseUrl;

  // Copy to clipboard
  navigator.clipboard
    .writeText(shareUrl)
    .then(() => {
      notyf.success("Link copied to clipboard!", "Share", {
        timeOut: 2000,
        closeButton: true,
        positionClass: "toast-bottom-right",
      });
    })
    .catch(() => {
      notyf.error("Failed to copy link", "Share Error", {
        timeOut: 2000,
        closeButton: true,
        positionClass: "toast-bottom-right",
      });
    });
}, 1000);

const searchBar = document.getElementById("search-bar");
const clearButton = document.getElementById("clear-search");

document.addEventListener("DOMContentLoaded", () => {
  const categoryItems = document.querySelectorAll(".category-item");

  categoryItems.forEach((item) => {
    item.addEventListener("click", function () {
      // Map directly to sort dropdown values
      const categoryClasses = {
        "category-limited-items": "name-limited-items",
        "category-vehicles": "name-vehicles",
        "category-rims": "name-rims",
        "category-spoilers": "name-spoilers",
        "category-body-colors": "name-body-colors",
        "category-textures": "name-textures",
        "category-hyperchromes": "name-hyperchromes",
        "category-tire-stickers": "name-tire-stickers",
        "category-tire-styles": "name-tire-styles",
        "category-drifts": "name-drifts",
        "category-furnitures": "name-furnitures",
        "category-favorites": "name-all-items",
        "category-horns": "name-horns",
      };

      // Find the matching category class
      const categoryClass = Array.from(this.classList).find((cls) =>
        Object.keys(categoryClasses).includes(cls)
      );

      if (!categoryClass) {
        console.error("No specific category class found");
        return;
      }

      // Get the corresponding sort value
      const sortValue = categoryClasses[categoryClass];

      // Update sort dropdown and value sort dropdown
      const sortDropdown = document.getElementById("sort-dropdown");
      const valueSortDropdown = document.getElementById("value-sort-dropdown");

      if (sortDropdown && valueSortDropdown) {
        sortDropdown.value = sortValue;

        // Set value sort dropdown based on category
        if (categoryClass === "category-favorites") {
          valueSortDropdown.value = "favorites";
        } else {
          // Reset to default cash-desc for all other categories
          valueSortDropdown.value = "cash-desc";
        }

        window.sortItems();

        // Updated selector to use the unique class
        const itemsSection = document.querySelector(".items-section-container");
        if (itemsSection) {
          setTimeout(() => {
            itemsSection.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
      } else {
        console.error("Dropdowns not found");
      }
    });
  });

  window.filterItems = debounce(function () {
    const searchTerm = document
      .getElementById("search-bar")
      .value.toLowerCase();
    const searchBar = document.getElementById("search-bar");
    const sortValue = document.getElementById("sort-dropdown").value;
    const valueSortType = document.getElementById("value-sort-dropdown").value;

    const itemsContainer = document.querySelector("#items-container");
    const searchMessages = document.getElementById("search-messages");

    // Save search term
    if (searchTerm) {
      localStorage.setItem("searchTerm", searchTerm);
    } else {
      localStorage.removeItem("searchTerm");
    }

    if (searchMessages) {
      searchMessages.innerHTML = "";
    }

    // First, apply category filter
    let categoryFilteredItems = [...allItems];
    if (sortValue !== "name-all-items") {
      const parts = sortValue.split("-");
      const itemType = parts.slice(1).join("-");
      categoryFilteredItems = allItems.filter((item) => {
        if (itemType === "limited-items") {
          return item.is_limited;
        }
        const normalizedItemType = item.type.toLowerCase().replace(" ", "-");
        const normalizedFilterType = itemType.slice(0, -1);
        return normalizedItemType === normalizedFilterType;
      });
    }

    // Apply search filter if search term exists
    if (searchTerm.length > 0) {
      filteredItems = categoryFilteredItems.filter((item) =>
        item.name.toLowerCase().startsWith(searchTerm)
      );
    } else {
      filteredItems = categoryFilteredItems;
    }

    // Apply the current sort after filtering
    if (valueSortType === "random") {
      filteredItems = shuffleArray([...filteredItems]);
    } else if (valueSortType.startsWith("cash-")) {
      filteredItems.sort((a, b) => {
        const valueA = formatValue(a.cash_value).numeric;
        const valueB = formatValue(b.cash_value).numeric;
        return valueSortType === "cash-asc" ? valueA - valueB : valueB - valueA;
      });
    } else if (valueSortType.startsWith("duped-")) {
      filteredItems.sort((a, b) => {
        const valueA = formatValue(a.duped_value).numeric;
        const valueB = formatValue(b.duped_value).numeric;
        return valueSortType === "duped-asc"
          ? valueA - valueB
          : valueB - valueA;
      });
    } else if (valueSortType.startsWith("alpha-")) {
      filteredItems.sort((a, b) => {
        return valueSortType === "alpha-asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      });
    } else if (valueSortType.startsWith("demand-")) {
      const demandOrder = [
        "Close to none",
        "Very Low",
        "Low",
        "Medium",
        "Decent",
        "High",
        "Very High",
      ];
      filteredItems.sort((a, b) => {
        let demandA = a.demand === "N/A" ? "-" : a.demand || "-";
        let demandB = b.demand === "N/A" ? "-" : b.demand || "-";

        if (demandA === "-" && demandB === "-") return 0;
        if (demandA === "-") return 1;
        if (demandB === "-") return -1;

        const indexA = demandOrder.findIndex(
          (d) => d.toLowerCase() === demandA.toLowerCase()
        );
        const indexB = demandOrder.findIndex(
          (d) => d.toLowerCase() === demandB.toLowerCase()
        );

        if (indexA === -1) return 1;
        if (indexB === -1) return -1;

        return valueSortType === "demand-asc"
          ? indexA - indexB
          : indexB - indexA;
      });
    } else if (valueSortType.startsWith("last-updated-")) {
      filteredItems.sort((a, b) => {
        if (!a.last_updated && !b.last_updated) return 0;
        if (!a.last_updated) return 1;
        if (!b.last_updated) return -1;

        return valueSortType === "last-updated-asc"
          ? a.last_updated - b.last_updated
          : b.last_updated - a.last_updated;
      });
    }

    // Update UI
    const itemType = sortValue.split("-").slice(1).join("-");
    updateTotalItemsLabel(itemType);
    updateTotalItemsCount();

    // Display no results message if needed
    if (filteredItems.length === 0 && searchTerm.length > 0) {
      let itemsRow = itemsContainer.querySelector(".row");
      if (!itemsRow) {
        itemsRow = document.createElement("div");
        itemsRow.classList.add("row");
        itemsContainer.appendChild(itemsRow);
      }

      const categoryMessage =
        sortValue !== "name-all-items"
          ? ` under category "${itemType.replace(/-/g, " ")}"`
          : "";

      itemsRow.innerHTML = `
            <div class="col-12 d-flex justify-content-center align-items-center" style="min-height: 300px;">
                <div class="no-results">
                    <h4>No items found for "${searchTerm}"${categoryMessage}</h4>
                    <p class="text-muted">Try different keywords or check the spelling</p>
                </div>
            </div>
        `;
      return;
    }

    currentPage = 1;
    displayItems();
  }, 300);

  const itemsContainer = document.querySelector("#items-container");
  if (!itemsContainer) return;

  let allItems = []; // Store all items
  let currentPage = 1;
  const itemsPerPage = 24;
  let filteredItems = [];
  let isLoading = false;
  let sort = ""; // Track current sort state

  // Define sortItems first before using it
  window.sortItems = function () {
    if (isLoading) {
      return;
    }
    if (!allItems || allItems.length === 0) {
      return;
    }

    const sortDropdown = document.getElementById("sort-dropdown");
    const valueSortDropdown = document.getElementById("value-sort-dropdown");
    const sortValue = sortDropdown?.value || "name-all-items";
    const valueSortType = valueSortDropdown?.value || "cash-desc";

    const currentSort = sortValue.split("-").slice(1).join("-");

    // Save current filter states
    sessionStorage.setItem("sortDropdown", sortValue);
    sessionStorage.setItem("valueSortDropdown", valueSortType);
    sort = sortValue;

    // IMPORTANT: Do filtering BEFORE updating UI
    const parts = sortValue.split("-");
    const sortType = parts[0];
    const itemType = parts.slice(1).join("-");

    // First filter by category
    if (itemType === "all-items") {
      filteredItems = [...allItems];
      localStorage.removeItem("lastSort");
    } else if (itemType === "limited-items") {
      filteredItems = allItems.filter((item) => item.is_limited);
    } else if (sortType === "name" && itemType === "hyperchromes") {
      filteredItems = allItems.filter((item) => item.type === "HyperChrome");
    } else {
      filteredItems = allItems.filter((item) => {
        const normalizedItemType = item.type.toLowerCase().replace(" ", "-");
        const normalizedFilterType = itemType.slice(0, -1);
        return normalizedItemType === normalizedFilterType;
      });
      localStorage.setItem("lastSort", sortValue);
    }

    // Apply value sorting
    if (valueSortType === "random") {
      filteredItems = shuffleArray([...filteredItems]);
    } else if (valueSortType === "favorites") {
      const token = getCookie("token");
      if (!token) {
        // Show login message if not logged in
        filteredItems = [];
        let itemsRow = itemsContainer.querySelector(".row");
        if (!itemsRow) {
          itemsRow = document.createElement("div");
          itemsRow.classList.add("row");
          itemsContainer.appendChild(itemsRow);
        }
        itemsRow.innerHTML = `
          <div class="col-12">
            <div class="no-favorites-message">
             <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
	<rect width="24" height="24" fill="none" />
	<path fill="#f8ff00" d="m8.85 16.825l3.15-1.9l3.15 1.925l-.825-3.6l2.775-2.4l-3.65-.325l-1.45-3.4l-1.45 3.375l-3.65.325l2.775 2.425zM5.825 21l1.625-7.025L2 9.25l7.2-.625L12 2l2.8 6.625l7.2.625l-5.45 4.725L18.175 21L12 17.275zM12 12.25" />
</svg>
              <h4>Login Required</h4>
              <p>You need to be logged in to view your favorite items</p>
              <div class="login-prompt">
                <a href="/login" class="login-link">Login now</a>
              </div>
            </div>
          </div>
        `;
        updateTotalItemsCount();
        updateTotalItemsLabel("favorites");
        return;
      }

      // Get only favorited items
      let favoriteItems = allItems.filter((item) => item.is_favorite);

      // Apply category filter if not on all-items
      if (itemType !== "all-items") {
        if (itemType === "limited-items") {
          favoriteItems = favoriteItems.filter((item) => item.is_limited);
        } else if (itemType === "hyperchromes") {
          favoriteItems = favoriteItems.filter(
            (item) => item.type === "HyperChrome"
          );
        } else {
          const normalizedFilterType = itemType.slice(0, -1); // Remove 's' from end
          favoriteItems = favoriteItems.filter((item) => {
            const normalizedItemType = item.type
              .toLowerCase()
              .replace(" ", "-");
            return normalizedItemType === normalizedFilterType;
          });
        }
      }

      filteredItems = favoriteItems;

      if (filteredItems.length === 0) {
        let itemsRow = itemsContainer.querySelector(".row");
        if (!itemsRow) {
          itemsRow = document.createElement("div");
          itemsRow.classList.add("row");
          itemsContainer.appendChild(itemsRow);
        }
        const categoryName =
          itemType === "all-items"
            ? ""
            : ` in ${itemType
                .split("-")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")}`;
        itemsRow.innerHTML = `
          <div class="col-12">
            <div class="no-favorites-message">
             <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
	<rect width="24" height="24" fill="none" />
	<path fill="#f8ff00" d="m8.85 16.825l3.15-1.9l3.15 1.925l-.825-3.6l2.775-2.4l-3.65-.325l-1.45-3.4l-1.45 3.375l-3.65.325l2.775 2.425zM5.825 21l1.625-7.025L2 9.25l7.2-.625L12 2l2.8 6.625l7.2.625l-5.45 4.725L18.175 21L12 17.275zM12 12.25" />
</svg>  
              <h4>No Favorites Yet${categoryName}</h4>
              <p>You haven't added any ${
                categoryName
                  ? `favorite items${categoryName}`
                  : "items to your favorites"
              }</p>
            </div>
          </div>
        `;
        return;
      }

      currentPage = 1;
      displayItems();
      updateTotalItemsLabel("favorites");
      return;
    } else if (valueSortType !== "none") {
      const [valueType, direction] = valueSortType.split("-");
      filteredItems.sort((a, b) => {
        const rawValueA = valueType === "cash" ? a.cash_value : a.duped_value;
        const rawValueB = valueType === "cash" ? b.cash_value : b.duped_value;

        // Check for N/A or empty values
        const isInvalidA =
          !rawValueA || rawValueA === "N/A" || rawValueA === "'N/A'";
        const isInvalidB =
          !rawValueB || rawValueB === "N/A" || rawValueB === "'N/A'";

        // If both are invalid, sort alphabetically by name
        if (isInvalidA && isInvalidB) {
          return a.name.localeCompare(b.name);
        }
        // Invalid values go to the end
        if (isInvalidA) return 1;
        if (isInvalidB) return -1;

        // For valid values, use numeric sorting
        const valueA =
          valueType === "cash"
            ? formatValue(rawValueA).numeric
            : formatValue(rawValueA).numeric;
        const valueB =
          valueType === "cash"
            ? formatValue(rawValueB).numeric
            : formatValue(rawValueB).numeric;

        return direction === "asc" ? valueA - valueB : valueB - valueA;
      });
    }

    // Apply alphabetical sorting
    if (valueSortType === "alpha-asc" || valueSortType === "alpha-desc") {
      filteredItems.sort((a, b) => {
        return valueSortType === "alpha-asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      });
    }

    // Apply demand sorting
    if (valueSortType === "demand-asc" || valueSortType === "demand-desc") {
      const demandOrder = [
        "Close to none",
        "Very Low",
        "Low",
        "Medium",
        "Decent",
        "High",
        "Very High",
      ];

      filteredItems.sort((a, b) => {
        let demandA = a.demand === "N/A" ? "-" : a.demand || "-";
        let demandB = b.demand === "N/A" ? "-" : b.demand || "-";

        if (demandA === "-" && demandB === "-") return 0;
        if (demandA === "-") return 1;
        if (demandB === "-") return -1;

        const indexA = demandOrder.findIndex(
          (d) => d.toLowerCase() === demandA.toLowerCase()
        );
        const indexB = demandOrder.findIndex(
          (d) => d.toLowerCase() === demandB.toLowerCase()
        );

        if (indexA === -1) return 1;
        if (indexB === -1) return -1;

        return valueSortType === "demand-asc"
          ? indexA - indexB
          : indexB - indexA;
      });
    }

    // Apply last updated sorting
    else if (
      valueSortType === "last-updated-desc" ||
      valueSortType === "last-updated-asc"
    ) {
      filteredItems.sort((a, b) => {
        // Handle null/undefined timestamps
        if (!a.last_updated && !b.last_updated) return 0;
        if (!a.last_updated) return 1;
        if (!b.last_updated) return -1;

        // Convert timestamps to milliseconds if they're in seconds
        const timestampA =
          a.last_updated.toString().length <= 10
            ? a.last_updated * 1000
            : a.last_updated;
        const timestampB =
          b.last_updated.toString().length <= 10
            ? b.last_updated * 1000
            : b.last_updated;

        // Sort by timestamp
        return valueSortType === "last-updated-desc"
          ? timestampB - timestampA
          : timestampA - timestampB;
      });
    }

    // Now update UI after all filtering and sorting is done
    updateSearchPlaceholder();
    updateTotalItemsLabel(itemType);

    // Apply current search if exists
    if (searchBar && searchBar.value.trim()) {
      filterItems();
    } else {
      currentPage = 1;
      displayItems();
    }

    // Update breadcrumb
    const categoryNameElement = document.querySelector(".category-name");
    const valuesBreadcrumb = document.getElementById("values-breadcrumb");

    if (sortValue === "name-all-items") {
      categoryNameElement.style.display = "none";
      valuesBreadcrumb.classList.add("active");
      valuesBreadcrumb.setAttribute("aria-current", "page");
      valuesBreadcrumb.innerHTML = "Values";
    } else {
      let categoryName;
      if (currentSort === "hyperchromes") {
        categoryName = "Hyperchromes";
      } else {
        categoryName = currentSort
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }

      categoryNameElement.innerHTML = `<a href="/values?sort=name-${currentSort}" onclick="handleCategoryClick(event, '${currentSort}')">${categoryName}</a>`;
      categoryNameElement.style.display = "list-item";
      categoryNameElement.classList.add("active");
      categoryNameElement.setAttribute("aria-current", "page");

      valuesBreadcrumb.classList.remove("active");
      valuesBreadcrumb.removeAttribute("aria-current");
      valuesBreadcrumb.innerHTML = '<a href="/values">Values</a>';
    }
  };

  // Now check for saved sort and value sort
  const savedSort = sessionStorage.getItem("sortDropdown");
  const savedValueSort =
    sessionStorage.getItem("valueSortDropdown") || "cash-desc";

  if (savedSort || savedValueSort) {
    const sortDropdown = document.getElementById("sort-dropdown");
    const valueSortDropdown = document.getElementById("value-sort-dropdown");

    if (sortDropdown && valueSortDropdown) {
      try {
        if (savedSort) sortDropdown.value = savedSort;
        if (savedValueSort) valueSortDropdown.value = savedValueSort;
        sort = savedSort; // Set global sort variable
        // Safely call sortItems only after setting both dropdowns
        if (typeof window.sortItems === "function") {
          window.sortItems();
        } else {
          console.error("sortItems function not properly initialized");
        }
      } catch (err) {
        console.error("Error restoring sort:", err);
      }
    }
  }

  document.getElementById("sort-dropdown").addEventListener("change", () => {
    window.sortItems();
  });

  document
    .getElementById("value-sort-dropdown")
    .addEventListener("change", () => {
      window.sortItems();
    });

  // Create and append spinner
  const spinner = document.createElement("div");
  spinner.className = "loading-spinner";
  spinner.innerHTML = `
     <div class="spinner-border" role="status">
       <span class="visually-hidden">Loading...</span>
     </div>
   `;
  itemsContainer.appendChild(spinner);

  const observer = new IntersectionObserver(
    (entries) => {
      const lastEntry = entries[0];
      if (lastEntry.isIntersecting && !isLoading) {
        loadMoreItems();
      }
    },
    {
      rootMargin: "100px", // Start loading 100px before reaching bottom
    }
  );

  const backToTopButton = document.getElementById("back-to-top");
  // Show button when scrolling down 300px
  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      backToTopButton.style.display = "flex";
    } else {
      backToTopButton.style.display = "none";
    }
  });

  // Scroll to top when button is clicked
  backToTopButton.addEventListener("click", () => {
    const itemsSection = document.querySelector(".items-section-container");
    if (itemsSection) {
      itemsSection.scrollIntoView({ behavior: "smooth" });
    }
  });

  // Restore filters from sessionStorage
  function restoreFilters() {
    const savedSortDropdown = sessionStorage.getItem("sortDropdown");
    const savedValueSort = sessionStorage.getItem("valueSortDropdown");

    if (savedSortDropdown) {
      document.getElementById("sort-dropdown").value = savedSortDropdown;
    }
    if (savedValueSort) {
      const valueSortDropdown = document.getElementById("value-sort-dropdown");

      valueSortDropdown.value = savedValueSort;
    }
    const savedSearch = localStorage.getItem("searchTerm");

    if (savedSortDropdown) {
      document.getElementById("sort-dropdown").value = savedSortDropdown;
    }
    if (savedValueSort) {
      document.getElementById("value-sort-dropdown").value = savedValueSort;
    }
    if (savedSearch) {
      const searchBar = document.getElementById("search-bar");
      searchBar.value = savedSearch;
      const clearButton = document.getElementById("clear-search");
      if (clearButton) {
        clearButton.style.display =
          searchBar.value.length > 0 ? "block" : "none";
      }
    }

    // Restore breadcrumb
    if (savedSortDropdown && savedSortDropdown !== "name-all-items") {
      const categoryName = savedSortDropdown
        .split("-")
        .slice(1)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      const categoryNameElement = document.querySelector(".category-name");
      categoryNameElement.textContent = categoryName;
      categoryNameElement.style.display = "list-item";
    }
  }

  // Call restoreFilters after elements are loaded
  restoreFilters();

  // Function to load more items
  // Function to load more items
  async function loadMoreItems() {
    if (isLoading) return;

    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    // Check if there are more items to load
    if (startIndex >= filteredItems.length) {
      return; // No more items to load
    }

    isLoading = true;

    // Show spinner when loading starts
    const spinner = document.querySelector(".loading-spinner");
    if (spinner) {
      spinner.classList.add("active");
    }

    // Add artificial delay to show loading state
    await new Promise((resolve) => setTimeout(resolve, 800));

    currentPage++;
    const itemsRow = document.querySelector("#items-container .row");
    const newItems = filteredItems.slice(startIndex, endIndex);

    // Create a document fragment to batch DOM updates
    const fragment = document.createDocumentFragment();

    // Add each new item to the fragment
    newItems.forEach((item) => {
      const cardDiv = createItemCard(item);
      fragment.appendChild(cardDiv); // Append to fragment instead of directly to itemsRow
    });

    // Append the fragment to the row (single DOM update)
    itemsRow.appendChild(fragment);

    // Hide spinner after loading completes
    if (spinner) {
      spinner.classList.remove("active");
    }
    isLoading = false;
  }

  updateSearchPlaceholder();

  // Clear search input
  if (searchBar) {
    searchBar.value = "";
    // Add event listener for showing/hiding clear button
    searchBar.addEventListener("input", function () {
      if (clearButton) {
        clearButton.style.display = this.value.length > 0 ? "block" : "none";
      }
    });
  }

  async function loadItems() {
    showLoadingOverlay();
    try {
      const response = await fetch(
        "https://api3.jailbreakchangelogs.xyz/items/list",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://jailbreakchangelogs.xyz",
          },
        }
      );
      allItems = await response.json();

      // Add favorite status to items if user is logged in and we have user data
      const token = getCookie("token");
      const userData = JSON.parse(localStorage.getItem("user") || "{}");

      if (token && userData.id) {
        try {
          const favoritesResponse = await fetch(
            `https://api3.jailbreakchangelogs.xyz/favorites/get?user=${userData.id}`,
            {
              headers: {
                "Content-Type": "application/json",
                Origin: "https://jailbreakchangelogs.xyz",
              },
            }
          );
          if (favoritesResponse.ok) {
            const favorites = await favoritesResponse.json();
            // Extract just the item_ids from the favorites array
            const favoriteIds = favorites.map((fav) => fav.item_id);
            // Mark items as favorite if their ID is in the favoriteIds array
            allItems = allItems.map((item) => ({
              ...item,
              is_favorite: favoriteIds.includes(item.id),
            }));
          }
        } catch (error) {
          console.error("Error fetching favorites:", error);
        }
      }

      // Initialize filteredItems
      filteredItems = [...allItems];

      // Check for saved preferences
      const savedSort = sessionStorage.getItem("sortDropdown");
      const savedValueSort = sessionStorage.getItem("valueSortDropdown");
      const searchValue = searchBar?.value?.trim() || "";

      // Set dropdown values
      const sortDropdown = document.getElementById("sort-dropdown");
      const valueSortDropdown = document.getElementById("value-sort-dropdown");

      if (sortDropdown && savedSort) {
        sortDropdown.value = savedSort;
      }
      if (valueSortDropdown) {
        valueSortDropdown.value = savedValueSort || "cash-desc";
      }

      // Instead of applying default sort, call sortItems() to apply saved preferences
      window.sortItems();

      // Start preloading images in background
      setTimeout(() => {
        preloadItemImages();
        const driftItems = allItems.filter((item) => item.type === "Drift");
        preloadDriftThumbnails(driftItems);
      }, 0);

      updateTotalItemsCount();
      hideLoadingOverlay();
    } catch (error) {
      console.error("Error in loadItems:", error);
      hideLoadingOverlay();
    }
  }

  function updateTotalItemsCount() {
    const totalItemsElement = document.getElementById("total-items");
    if (totalItemsElement) {
      totalItemsElement.textContent = filteredItems.length;
    }
  }

  function addSentinel() {
    const sentinel = document.createElement("div");
    sentinel.className = "sentinel";
    sentinel.style.height = "1px";
    const itemsContainer = document.querySelector("#items-container");
    itemsContainer.appendChild(sentinel);
    return sentinel;
  }

  function displayItems() {
    const itemsContainer = document.querySelector("#items-container");
    if (!itemsContainer) {
      console.warn("Items container not found");
      return;
    }

    let itemsRow = itemsContainer.querySelector(".row");
    const spinner = itemsContainer.querySelector(".loading-spinner");

    if (!itemsRow || currentPage === 1) {
      if (spinner) {
        spinner.remove();
      }

      itemsContainer.innerHTML = `
            <div class="row g-3" id="items-list"></div>
            <div class="loading-spinner">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;

      itemsRow = itemsContainer.querySelector(".row");
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const itemsToDisplay = filteredItems.slice(startIndex, endIndex);

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < itemsToDisplay.length; i++) {
      const cardDiv = createItemCard(itemsToDisplay[i]);
      fragment.appendChild(cardDiv);
    }

    itemsRow.appendChild(fragment);

    const oldSentinel = itemsContainer.querySelector(".sentinel");
    if (oldSentinel) {
      oldSentinel.remove();
    }

    if (endIndex < filteredItems.length) {
      const sentinel = addSentinel();
      observer.observe(sentinel);
    }

    updateTotalItemsCount();
  }

  function loadimage(image_url) {
    if (image_url) {
      const image = new Image();
      image.src = image_url;
    }
  }

  function formatValue(value) {
    // Return default object if value is null, undefined, or empty string
    if (value === null || value === undefined || value === "") {
      return {
        display: "No Value", // Changed from "-" to "No Value"
        numeric: 0,
      };
    }

    // Convert string values like "7.5m" or "75k" to numbers
    let numericValue = value;
    if (typeof value === "string") {
      // Normalize the string: replace comma with period for decimal numbers
      value = value.toLowerCase().replace(",", ".");
      if (value.endsWith("m")) {
        numericValue = parseFloat(value) * 1000000;
      } else if (value.endsWith("k")) {
        numericValue = parseFloat(value) * 1000;
      } else {
        numericValue = parseFloat(value);
      }
    }

    // Return default object if conversion resulted in NaN
    if (isNaN(numericValue)) {
      return {
        display: "-",
        numeric: 0,
      };
    }

    // Format display value based on screen size
    let displayValue;
    if (window.innerWidth <= 768) {
      // Mobile devices - use 2 decimal places for better precision
      if (numericValue >= 1000000) {
        displayValue =
          (numericValue / 1000000).toFixed(2).replace(/\.?0+$/, "") + "M";
      } else if (numericValue >= 1000) {
        displayValue =
          (numericValue / 1000).toFixed(2).replace(/\.?0+$/, "") + "K";
      } else {
        displayValue = numericValue.toString();
      }
    } else {
      // Desktop - use comma formatting
      displayValue = numericValue.toLocaleString("en-US");
    }

    return {
      display: displayValue,
      numeric: numericValue,
    };
  }

  function createItemCard(item) {
    console.log("Creating card for:", item.name, item.type);
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("col-6", "col-md-4", "col-lg-3", "mb-4");

    const favoriteIconHtml = `
    <div class="favorite-icon position-absolute top-0 start-0 p-2" 
         style="z-index: 1000; opacity: 1; transition: opacity 0.2s ease-in-out;">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
           style="filter: drop-shadow(0 0 2px rgba(0,0,0,0.7));">
        <rect width="24" height="24" fill="none" />
        <path fill="${item.is_favorite ? "#f8ff00" : "none"}" 
              stroke="${item.is_favorite ? "none" : "#f8ff00"}"
              stroke-width="1.5"
              d="M12.954 1.7a1 1 0 0 0-1.908-.001l-2.184 6.92l-6.861-.005a1 1 0 0 0-.566 1.826l5.498 3.762l-2.067 6.545A1 1 0 0 0 6.4 21.86l5.6-4.006l5.594 4.007a1 1 0 0 0 1.536-1.114l-2.067-6.545l5.502-3.762a1 1 0 0 0-.566-1.826l-6.866.005z" />
      </svg>
    </div>
  `;

    // Determine color based on item type - FIX: Declare the color variable
    let color = "#124e66"; // Default color
    if (item.type === "Vehicle") color = "#c82c2c";
    if (item.type === "Spoiler") color = "#C18800";
    if (item.type === "Rim") color = "#6335B1";
    if (item.type === "Tire Sticker") color = "#1CA1BD";
    if (item.type === "Tire Style") color = "#4CAF50";
    if (item.type === "Drift") color = "#FF4500";
    if (item.type === "Body Color") color = "#8A2BE2";
    if (item.type === "Texture") color = "#708090";
    if (item.type === "HyperChrome") color = "#E91E63";
    if (item.type === "Furniture") color = "#9C6644";
    if (item.type === "Horn") color = "#4A90E2";

    // Modify the mediaElement template
    let mediaElement;
    if (item.type === "Horn") {
      mediaElement = `
        <div class="media-container position-relative" onclick="handleHornClick('${item.name}', event)">
          ${favoriteIconHtml}
          <div class="horn-player-wrapper" data-horn="${item.name}">
            <img src="/assets/audios/horn_thumbnail.webp" class="card-img-top" alt="Horn Thumbnail" style="opacity: 0.8;">
            <audio class="horn-audio" preload="none">
              <source src="/assets/audios/horns/${item.name}.mp3" type="audio/mp3">
            </audio>
          </div>
        </div>`;
    } else if (item.type === "Drift") {
      mediaElement = `
        <div class="media-container position-relative">
          ${favoriteIconHtml}
          <img src="/assets/images/items/480p/drifts/${item.name}.webp"
               width="854" 
               height="480"
               class="card-img-top thumbnail" 
               alt="${item.name}" 
               onerror="handleimage(this)">
          <video src="/assets/images/items/drifts/${item.name}.webm" class="card-img-top video-player" style="opacity: 0;" playsinline muted loop></video>
        </div>`;
    } else if (item.type === "HyperChrome" && item.name === "HyperShift") {
      mediaElement = `
        <div class="media-container position-relative">
            ${favoriteIconHtml}
            <video src="/assets/images/items/hyperchromes/HyperShift.webm" class="card-img-top" playsinline muted loop autoplay id="hypershift-video" onerror="handleimage(this)"></video>
        </div>`;
    } else {
      const itemType = item.type.toLowerCase();
      mediaElement = `
        <div class="media-container position-relative">
            ${favoriteIconHtml}
            <img id="${item.name}" 
                 src="/assets/images/items/480p/${itemType}s/${item.name}.webp"
                 width="854"
                 height="480" 
                 class="card-img-top"
                 alt="${item.name}"
                 onerror="handleimage(this)">
        </div>`;
    }

    // Case for HyperShift inside createItemCard function
    if (item.name === "HyperShift" && item.type === "HyperChrome") {
      mediaElement = `
        <div class="media-container position-relative">
            ${favoriteIconHtml}
            <img 
                src="/assets/images/items/hyperchromes/HyperShift.gif"
                class="card-img-top"
                alt="${item.name}"
                style="width: 100%; height: 100%; object-fit: contain;"
            >
        </div>`;
    }

    // Format values
    const cashValue = formatValue(item.cash_value);
    const dupedValue = formatValue(item.duped_value);
    window.handleFavorite = async function (event, itemId) {
      event.preventDefault();
      event.stopPropagation();

      const token = getCookie("token");
      if (!token) {
        notyf.error("Please login to favorite items", {
          position: "bottom-right",
          duration: 2000,
        });
        return;
      }

      // Get the SVG path element
      const svgPath = event.target
        .closest(".favorite-icon")
        .querySelector("path");
      const isFavorited = svgPath.getAttribute("fill") === "#f8ff00";

      try {
        const response = await fetch(
          `https://api3.jailbreakchangelogs.xyz/favorites/${
            isFavorited ? "remove" : "add"
          }`,
          {
            method: isFavorited ? "DELETE" : "POST", // Use DELETE for remove, POST for add
            headers: {
              "Content-Type": "application/json",
              Origin: "https://jailbreakchangelogs.xyz",
            },
            body: JSON.stringify({
              item_id: itemId,
              owner: token,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        // Update SVG appearance
        if (isFavorited) {
          svgPath.setAttribute("fill", "none");
          svgPath.setAttribute("stroke", "#f8ff00");
        } else {
          svgPath.setAttribute("fill", "#f8ff00");
          svgPath.setAttribute("stroke", "none");
        }

        // Update item's favorite status in allItems array
        const item = allItems.find((item) => item.id === itemId);
        if (item) {
          item.is_favorite = !isFavorited;
        }

        // Show success message
        notyf.success(
          isFavorited
            ? "Item removed from favorites"
            : "Item added to favorites",
          {
            position: "bottom-right",
            duration: 2000,
          }
        );
      } catch (error) {
        console.error("Error updating favorite:", error);
        notyf.error("Failed to update favorite status", {
          position: "bottom-right",
          duration: 2000,
        });
      }
    };

    // Add this to your CSS or style tag
    const style = document.createElement("style");
    style.textContent = `
  .favorite-icon {
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
  }
  
  .items-card:hover .favorite-icon {
    opacity: 1;
  }
  
  .favorite-icon i {
    filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));
  }
`;
    document.head.appendChild(style);

    let badgeHtml = "";
    let typeBadgeHtml = "";

    if (item.type === "HyperChrome") {
      badgeHtml = `
            <span class="hyperchrome-badge">
              HyperChrome
            </span>
        `;
      typeBadgeHtml = "";
    } else {
      // Only show type badge for non-HyperChrome items
      typeBadgeHtml = `
            <span class="badge item-type-badge" style="background-color: ${color};">${item.type}</span>
        `;

      // Show limited badge if item is limited
      if (item.is_limited) {
        badgeHtml = `
                <span class="badge limited-badge">
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" style="margin-right: 4px">
	<rect width="24" height="24" fill="none" />
	<path fill="#000" d="M12 20a8 8 0 0 0 8-8a8 8 0 0 0-8-8a8 8 0 0 0-8 8a8 8 0 0 0 8 8m0-18a10 10 0 0 1 10 10a10 10 0 0 1-10 10C6.47 22 2 17.5 2 12A10 10 0 0 1 12 2m.5 5v5.25l4.5 2.67l-.75 1.23L11 13V7z" />
</svg>Limited
                </span>
            `;
      }
    }
    const lastUpdatedHtml = `
    <div class="mt-2 d-flex align-items-center">
        <small class="text-muted" style="font-size: 0.8rem;">
           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16">
	<rect width="16" height="16" fill="none" />
	<g fill="#748d92">
		<path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022zm2.004.45a7 7 0 0 0-.985-.299l.219-.976q.576.129 1.126.342zm1.37.71a7 7 0 0 0-.439-.27l.493-.87a8 8 0 0 1 .979.654l-.615.789a7 7 0 0 0-.418-.302zm1.834 1.79a7 7 0 0 0-.653-.796l.724-.69q.406.429.747.91zm.744 1.352a7 7 0 0 0-.214-.468l.893-.45a8 8 0 0 1 .45 1.088l-.95.313a7 7 0 0 0-.179-.483m.53 2.507a7 7 0 0 0-.1-1.025l.985-.17q.1.58.116 1.17zm-.131 1.538q.05-.254.081-.51l.993.123a8 8 0 0 1-.23 1.155l-.964-.267q.069-.247.12-.501m-.952 2.379q.276-.436.486-.908l.914.405q-.24.54-.555 1.038zm-.964 1.205q.183-.183.35-.378l.758.653a8 8 0 0 1-.401.432z" />
		<path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0z" />
		<path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5" />
	</g>
</svg>
            Last Updated: ${
              item.last_updated ? formatTimeAgo(item.last_updated) : "N/A"
            }
        </small>
    </div>
    `;

    // Create card with all elements
    const cardHtml = `
        <div class="card items-card shadow-sm ${
          item.is_limited ? "limited-item" : ""
        }" 
             style="cursor: pointer;">
            <div class="position-relative">
                ${mediaElement}
                <div class="item-card-body text-center">
                    <div class="badges-container d-flex justify-content-center gap-2">
                        ${typeBadgeHtml}
                        ${badgeHtml}
                    </div>
                    <h5 class="card-title">${item.name}</h5>
                    <div class="value-container">
                        <div class="d-flex justify-content-between align-items-center mb-2 value-row">
                            <span>Cash Value:</span>
                            <span class="cash-value" data-value="${
                              cashValue.numeric
                            }">${cashValue.display}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mb-2 value-row">
                            <span>Duped Value:</span>
                            <span class="duped-value" data-value="${
                              dupedValue.numeric
                            }">${dupedValue.display}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center value-row">
                            <span>Demand:</span>
                            <span class="demand-value">${
                              item.demand === "'N/A'" || item.demand === "N/A"
                                ? "No Demand"
                                : item.demand || "No Value"
                            }</span>
                        </div>
                         ${lastUpdatedHtml}
                    </div>
                </div>
            </div>
        </div>`;

    cardDiv.innerHTML = cardHtml;

    // Add event listener for the favorite icon
    const favoriteIcon = cardDiv.querySelector(".favorite-icon");
    if (favoriteIcon) {
      favoriteIcon.addEventListener("click", (e) => {
        e.stopPropagation();
        window.handleFavorite(e, item.id);
      });
    }

    // Add hover event listeners for drift videos
    if (item.type === "Drift") {
      const card = cardDiv.querySelector(".card");
      const video = cardDiv.querySelector("video");
      const thumbnail = cardDiv.querySelector(".thumbnail");

      card.addEventListener("mouseenter", () => {
        video.style.opacity = "1";
        thumbnail.style.opacity = "0";
        video.play();
      });

      card.addEventListener("mouseleave", () => {
        video.style.opacity = "0";
        thumbnail.style.opacity = "1";
        video.pause();
        video.currentTime = 0;
      });
    }

    // New click handler logic - Update this part only
    const card = cardDiv.querySelector(".items-card");
    if (!card) {
      console.error("Could not find .items-card element for:", item.name);
      return cardDiv;
    }

    // Debug click handling setup
    console.log("Setting up click handler for:", item.name);

    card.addEventListener("click", (e) => {
      console.log("Raw click event on card:", {
        item: item.name,
        type: item.type,
        target: e.target.tagName,
        targetClasses: e.target.className,
        path: e.composedPath().map((el) => ({
          tag: el.tagName,
          class: el.className,
        })),
      });

      // Always ignore favorite icon clicks
      if (e.target.closest(".favorite-icon")) {
        console.log("Favorite icon clicked - ignoring navigation");
        return;
      }

      // For horns, only navigate if clicking card-body
      if (item.type === "Horn") {
        const isCardBody = e.target.closest(".item-card-body");
        console.log("Horn item clicked:", {
          isCardBody,
          shouldNavigate: isCardBody,
        });
        if (!isCardBody) {
          console.log("Horn media clicked - not navigating");
          return;
        }
      }

      // For drift items, check if clicking video/thumbnail
      if (item.type === "Drift" && e.target.closest(".media-container")) {
        console.log("Drift media clicked - letting media handler work");
        return;
      }

      // Navigate to item page
      const formattedType = item.type.toLowerCase();
      const formattedName = encodeURIComponent(item.name);
      const url = `/item/${formattedType}/${formattedName}`;
      console.log("Navigating to:", url);
      window.location.href = url;
    });

    // Add click handlers for media containers
    const mediaContainer = cardDiv.querySelector(".media-container");
    if (mediaContainer) {
      mediaContainer.addEventListener("click", (e) => {
        // Only prevent default and stop propagation for Drift and Horn items
        if (item.type === "Drift" || item.type === "Horn") {
          e.preventDefault();
          e.stopPropagation();

          if (item.type === "Drift") {
            const video = mediaContainer.querySelector("video");
            const thumbnail = mediaContainer.querySelector(".thumbnail");

            if (video.paused) {
              video.style.opacity = "1";
              thumbnail.style.opacity = "0";
              video.play();
            } else {
              video.style.opacity = "0";
              thumbnail.style.opacity = "1";
              video.pause();
              video.currentTime = 0;
            }
          }
          // Horn clicks are handled by onclick attribute
        }
        // For other items, let the click propagate to the card
      });
    }

    // Return the created element
    return cardDiv;
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function preloadItemImages() {
    if (!allItems || allItems.length === 0) return;

    // Create a loading queue to prevent overwhelming the browser
    const imageQueue = allItems
      .map((item) => {
        // Skip drift items and horn items
        if (
          item.type.toLowerCase() === "drift" ||
          item.type.toLowerCase() === "horn"
        ) {
          return null;
        }

        const image_type = item.type.toLowerCase();
        return `/assets/images/items/480p/${image_type}s/${item.name}.webp`;
      })
      .filter((url) => url !== null);

    // Load images in batches of 10
    const batchSize = 10;
    let currentBatch = 0;

    function loadBatch() {
      const batch = imageQueue.slice(currentBatch, currentBatch + batchSize);
      if (batch.length === 0) return;

      batch.forEach((url) => {
        const img = new Image();
        img.src = url;
      });

      currentBatch += batchSize;
      if (currentBatch < imageQueue.length) {
        setTimeout(loadBatch, 100); // Load next batch after 100ms
      }
    }

    loadBatch();
  }

  // Update clearFilters function
  window.clearFilters = debounce(function () {
    // Clear sessionStorage
    sessionStorage.removeItem("sortDropdown");
    sessionStorage.removeItem("valueSortDropdown");

    // Reset dropdowns
    document.getElementById("sort-dropdown").value = "name-all-items";
    document.getElementById("value-sort-dropdown").value = "cash-desc"; // Match initial load state

    // Reset items display
    currentPage = 1;
    filteredItems = [...allItems];
    // Sort by cash value descending to match the dropdown value
    filteredItems.sort((a, b) => {
      const valueA = formatValue(a.cash_value).numeric;
      const valueB = formatValue(b.cash_value).numeric;
      return valueB - valueA;
    });

    // If there's a search term, perform the search
    const searchValue = searchBar?.value?.trim() || "";
    if (searchValue) {
      filterItems();
    } else {
      displayItems();
      updateTotalItemsCount();
      updateTotalItemsLabel("all-items");
    }

    updateSearchPlaceholder();

    notyf.success("Filters have been reset", "Filters Reset");
  }, 500);

  // Modify the value-sort-dropdown options in the HTML
  // Modify the value-sort-dropdown options in the HTML
  const valueSortDropdown = document.getElementById("value-sort-dropdown");
  if (valueSortDropdown) {
    valueSortDropdown.innerHTML = `
    <option value="random">Random</option>
    <option value="favorites">My Favorites</option>
    <option value="separator" disabled>───── Alphabetically ─────</option>
    <option value="alpha-asc">Name (A to Z)</option>
    <option value="alpha-desc">Name (Z to A)</option>
    <option value="separator" disabled>───── Values ─────</option>
    <option value="cash-asc">Cash Value (Low to High)</option>
    <option value="cash-desc">Cash Value (High to Low)</option>
    <option value="duped-asc">Duped Value (Low to High)</option>
    <option value="duped-desc">Duped Value (High to Low)</option>
    <option value="separator" disabled>───── Demand ─────</option>
    <option value="demand-asc">Demand (Low to High)</option>
    <option value="demand-desc">Demand (High to Low)</option>
    <option value="separator" disabled>───── Last Updated ─────</option>
    <option value="last-updated-asc">Last Updated (Oldest to Newest)</option>
    <option value="last-updated-desc">Last Updated (Newest to Oldest)</option>
  `;

    // Check sessionStorage first, fallback to random
    const savedValueSort = sessionStorage.getItem("valueSortDropdown");

    valueSortDropdown.value = savedValueSort || "cash-desc";
    sortItems(); // Apply initial sort
  }

  loadItems(); // Initial load

  // Handle URL parameters and clean up URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("sort")) {
    const sortValue = urlParams.get("sort");
    // Validate sort parameter
    if (VALID_SORTS.includes(sortValue)) {
      const dropdown = document.getElementById("sort-dropdown");
      dropdown.value = `name-${sortValue}`;
      sessionStorage.setItem("sortDropdown", dropdown.value);
    }
  }
  if (urlParams.has("valueSort")) {
    const valueSort = urlParams.get("valueSort");
    const valueSortDropdown = document.getElementById("value-sort-dropdown");
    valueSortDropdown.value = valueSort;
    sessionStorage.setItem("valueSortDropdown", valueSort);
  }

  // Clean up URL after storing parameters
  window.history.replaceState({}, "", window.location.pathname);

  // Apply the sort
  sortItems();

  // Restore contributors section state on mobile
  if (window.innerWidth <= 768) {
    const grid = document.querySelector(".contributors-grid");
    const icon = document.querySelector(".toggle-icon");
    const expanded = localStorage.getItem("contributorsExpanded") === "true";

    if (expanded) {
      grid.classList.add("expanded");
      icon.classList.add("collapsed");
    }
  }
});

// Default Image
window.handleimage = function (element) {
  const isHyperShift =
    element.id === "hypershift-video" ||
    (element.alt === "HyperShift" &&
      element.closest(".media-container")?.querySelector("video"));

  if (isHyperShift) {
    return;
  }

  element.src =
    "https://placehold.co/2560x1440/212A31/D3D9D4?text=No+Image+Available&font=Montserrat.webp";
};

function clearSearch() {
  const searchBar = document.getElementById("search-bar");
  const clearButton = document.getElementById("clear-search");

  if (searchBar) {
    searchBar.value = "";
    filterItems();
  }

  if (clearButton) {
    clearButton.style.display = "none";
  }
}

function updateTotalItemsLabel(itemType) {
  const totalItemsLabel = document.getElementById("total-items-label");
  if (totalItemsLabel) {
    if (itemType === "favorites") {
      totalItemsLabel.textContent = "Total Favorites: ";
    } else if (itemType === "all-items") {
      totalItemsLabel.textContent = "Total Items: ";
    } else {
      let categoryName;
      if (itemType === "hyperchromes") {
        categoryName = "HyperChrome";
      } else {
        categoryName = itemType
          .slice(0, -1)
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }
      totalItemsLabel.textContent = `Total ${categoryName}s: `;
    }
  }
}

function updateSearchPlaceholder() {
  const sortValue = document.getElementById("sort-dropdown").value;
  const searchBar = document.getElementById("search-bar");

  // Extract category from sort value (e.g., 'name-vehicles' -> 'vehicles')
  const category = sortValue.split("-").slice(1).join("-");

  // Define placeholders for different categories
  const placeholders = {
    "all-items": "Search items...",
    "limited-items": "Search limited items...",
    vehicles: "Search vehicles (e.g., Brulee, Torpedo)...",
    spoilers: "Search spoilers (e.g., Rocket, Wing)...",
    rims: "Search rims (e.g., Star, Spinner)...",
    "tire-stickers": "Search tire stickers (e.g., Badonuts, Blue 50)...",
    "tire-styles": "Search tire styles (e.g., Brickset, Glacier)...",
    drifts: "Search drifts... (e.g., Cartoon, Melons)...",
    "body-colors": "Search colors (e.g., Red, Blue)...",
    textures: "Search textures (e.g., Aurora, Checkers)...",
    hyperchromes: "Search HyperChromes (e.g., HyperBlue Level 2)...",
    furniture: "Search furniture (e.g., Nukamo Fridge, Bloxy Lisa)...",
  };

  // Set the placeholder text
  searchBar.placeholder = placeholders[category] || "Search items...";
}

window.handleCardClick = function (name, type, event) {
  // Prevent opening card on right click (event.button = 2)
  if (event.button === 2) {
    return;
  }

  // Only handle navigation if click is in card-body
  if (!event.target.closest(".item-card-body")) {
    return;
  }

  event.preventDefault();

  // Always convert spaces to hyphens for consistent storage
  const formattedType = type.replace(/\s+/g, "-");

  // Store both dropdown values before navigating
  const currentSort = document.getElementById("sort-dropdown").value;
  const currentValueSort = document.getElementById("value-sort-dropdown").value;

  sessionStorage.setItem("sortDropdown", currentSort);
  sessionStorage.setItem("valueSortDropdown", currentValueSort);

  const formattedName = encodeURIComponent(name);
  const formattedUrlType = encodeURIComponent(type.toLowerCase());
  const url = `/item/${formattedUrlType}/${formattedName}`;

  window.location.href = url;
};

window.handleCategoryClick = function (event, category) {
  event.preventDefault();

  const hyphenatedCategory = category.replace(/\s+/g, "-");
  const dropdown = document.getElementById("sort-dropdown");
  const newValue = `name-${hyphenatedCategory}`;
  dropdown.value = newValue;
  sessionStorage.setItem("sortDropdown", newValue);

  // Get the current value sort
  const valueSortDropdown = document.getElementById("value-sort-dropdown");
  const valueSort = valueSortDropdown.value;
  sessionStorage.setItem("valueSortDropdown", valueSort);

  sortItems();
};

// Add new function for horn playback
function handleHornClick(hornName, event) {
  event.preventDefault();
  event.stopPropagation();

  const audioElement = document.querySelector(
    `[data-horn="${hornName}"] audio`
  );

  // Stop all other playing horns first
  document.querySelectorAll(".horn-audio").forEach((audio) => {
    if (audio !== audioElement) {
      audio.pause();
      audio.currentTime = 0;
    }
  });

  if (audioElement.paused) {
    audioElement.play();
  } else {
    audioElement.pause();
    audioElement.currentTime = 0;
  }
}

// Make sure sortItems is accessible globally
if (typeof window.sortItems !== "function") {
  console.warn("sortItems not found on window object, ensuring it's defined");
  window.sortItems = function () {
    console.warn("Fallback sortItems called - page may need refresh");
  };
}

function toggleContributors(header) {
  const grid = header.nextElementSibling;
  const icon = header.querySelector(".toggle-icon");

  if (window.innerWidth <= 768) {
    grid.classList.toggle("expanded");
    icon.classList.toggle("collapsed");

    // Store the state in localStorage
    localStorage.setItem(
      "contributorsExpanded",
      grid.classList.contains("expanded")
    );
  }
}

// Add preloading specifically for drift thumbnails
function preloadDriftThumbnails(driftItems) {
  if (!driftItems || driftItems.length === 0) return;

  driftItems.forEach((item) => {
    const img = new Image();
    img.src = `/assets/images/items/480p/drifts/${item.name}.webp`;
  });
}
