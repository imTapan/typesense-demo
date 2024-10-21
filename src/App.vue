<template>
  <div class="container mx-auto py-6">
    <div class="search-input flex flex-col">
      <input
        v-model="query"
        @input="handleInputs"
        placeholder="Search products..."
        class="border p-2 rounded-md max-w-lg mx-auto border-red-600"
        autofocusff
      />
    </div>
    <div class="search-results border p-2 mt-8 flex flex-col gap-2">
      <h2 class="font-bold">Filters & Sorts:</h2>

      <div class="sort-by border p-1 rounded">
        Search Type :
        <AwRadioGroup
          class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm"
          v-model="selectedSearchType"
          :options="searchType"
          @change="handleInputs"
        />
      </div>
    </div>
    <div
      class="facet-filters border p-2 mt-4 flex flex-col gap-2"
      v-if="facets?.length"
    >
      <h2 class="font-bold">Facet Filters:</h2>

      <template v-for="facet in facets">
        <div class="facet-group border p-1 rounded" v-if="facet.counts?.length">
          <h3 class="font-semibold capitalize">
            {{ facet.field_name.replace("_", " ") }}
          </h3>

          <div class="facet-options">
            <AwCheckboxGroup
              :options="
                facet.counts.map((count) => ({
                  label: `${count.value} [${count?.count}]`,
                  value: count.value,
                }))
              "
              class="grid gap-2 grid-cols-1 md:grid-cols-4"
              v-model="selectedFacets[facet.field_name]"
              @change="handleInputs"
            />
          </div>
        </div>
      </template>
    </div>

    <div class="search-results border p-2 mt-4 flex flex-col gap-2">
      <h2 class="font-bold">Filters & Sorts:</h2>

      <div class="sort-by border p-1 rounded">
        Sort By :
        <AwRadioGroup
          class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm"
          v-model="selectedSort"
          :options="sortingOption"
          @change="handleInputs"
        />
      </div>
      <div class="sort-by border p-1 rounded">
        Select City:
        <AwCheckboxGroup
          class="grid gap-3 grid-cols-1 md:grid-cols-4"
          label-key=""
          @change="handleInputs"
          v-model="selectedCities"
          :options="uniqueCities"
        />
      </div>
    </div>
    <div class="search-results border p-2 mt-8" v-if="results?.length">
      <div v-if="results.length">
        <h2 class="font-bold text-lg">
          Search Results:
          <span class="text-sm">( {{ totalResults }} Results Found)</span>
        </h2>
        <ul class="mt-2 border p-2">
          <li
            v-for="(product, i) in results"
            :key="product.url_key"
            class="flex gap-5 items-center"
          >
            <div class="flex gap-5">
              <span>{{ i + 1 }}</span>
              <span>{{ product.name }}</span>
              <!-- <img :src="product.image" class="h-5 w-5 rounded-sm" /> -->
            </div>
            <span> ₹ {{ product.price }}</span>
          </li>
        </ul>
      </div>
      <div v-else-if="query.length > 0">
        <p>No results found.</p>
      </div>
      <!-- Pagination Controls -->
      <div
        v-if="totalPages > 1"
        class="pagination-controls flex justify-center items-center gap-4 mt-4"
      >
        <button
          @click="goToPreviousPage"
          :disabled="currentPage === 1"
          class="px-4 py-2 bg-gray-200 rounded"
        >
          Previous
        </button>

        <span>Page {{ currentPage }} of {{ totalPages }}</span>

        <button
          @click="goToNextPage"
          :disabled="currentPage === totalPages"
          class="px-4 py-2 bg-gray-200 rounded"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Search Type
const selectedSearchType = ref("holiday_packages");
const searchType = [
  {
    label: "Holiday Packages",
    value: "holiday_packages",
  },
  {
    label: "Things to Do",
    value: "things_to_do",
  },
  {
    label: "Travel Passes",
    value: "travel_passes",
  },
  {
    label: "Sims & WIFI",
    value: "sims_wifi",
  },
];

// Display Result
const totalResults = ref(0);
const results = ref([]);

// Pagination
const currentPage = ref(1); // Current page being viewed
const totalPages = ref(0); // Total number of pages
const resultsPerPage = ref(15); // Results per page, you can adjust this as needed

// Search
const query = ref("");

// Cities Filter
const uniqueCities = ref([]);
const selectedCities = ref([]);

// Sorting
const selectedSort = ref("price:asc");
const sortingOption = ref([
  {
    key: "price_low_to_high",
    label: "Price Low to High",
    value: "price:asc",
  },
  {
    key: "price_high_to_low",
    label: "Price High to Low",
    value: "price:desc",
  },
  {
    key: "name_ascending",
    label: "Name Ascending",
    value: "name:asc",
  },
  {
    key: "name_descending",
    label: "Name Descending",
    value: "name:desc",
  },
]);

// Available facets and selected facet filters
const facets = ref([]);
const selectedFacets = ref({});

async function handleInputs() {
  // searchThroughCollections();
  performMultiSearch();
}

// Old : Search Using Document & Collection Query
async function searchThroughCollections() {
  if (query.value.length) {
    try {
      // Search in tour_cities collection
      const cityResults = await $typesense
        .collections("products_old")
        .documents()
        .search({
          q: query.value,
          query_by: "name",
        });

      // Combine results from both collections
      results.value = [...cityResults.hits.map((hit) => hit.document)];
    } catch (error) {
      console.error("Search error:", error);
      results.value = [];
    }
  } else {
    results.value = [];
  }
}

const createSearchQuery = () => {
  // Construct city filter
  const cityFilter =
    selectedCities.value.length > 0
      ? selectedCities.value
          .map((city) => `tour_city.name:="${city}"`)
          .join(" || ")
      : "";

  // Construct facet filters based on selected facet values
  const facetFilter = Object.entries(selectedFacets.value)
    .filter(([key, values]) => values.length > 0)
    .map(([key, values]) => {
      if (values.length > 1) {
        return values.map((value) => `${key}:="${value}"`).join(" || ");
      } else {
        return `${key}:="${values[0]}"`;
      }
    })
    .join(" && ");

  // Combine city and facet filters if both exist
  const filterQuery = [cityFilter, facetFilter].filter(Boolean).join(" && ");

  return {
    q: query.value, // Search keywords or text
    query_by: "name,short_description_alike", // Fields to search in
    sort_by: selectedSort.value, // Sorting by price or name
    filter_by: filterQuery, // City filter and facet filters applied here
    per_page: resultsPerPage.value, // Number of results per page
    page: currentPage.value, // Pagination
    include_fields: "name,price", // Specify the fields to return in the response
    facet_by:
      "tour_categories,suitable_for,good_for,type,item_type,item_category", // Facet fields for counting
  };
};

// Fetch Multi Search Results
async function performMultiSearch() {
  results.value = [];
  totalResults.value = 0;
  const searchQueries = [createSearchQuery()];

  try {
    const multiSearchResponse = await $typesense.multiSearch.perform({
      searches: searchQueries.map((query) => ({
        collection: "products_old",
        ...query,
      })),
    });

    if (multiSearchResponse?.results[0]?.error) {
      $toast.error(multiSearchResponse?.results[0]?.error);
    } else if (multiSearchResponse?.results?.length) {
      const { found, hits, facet_counts } = multiSearchResponse?.results[0];

      results.value = [...hits.map((hit) => hit.document)];
      facets.value = facet_counts; // Update facets with the new counts

      totalResults.value = found;
      // Update totalPages based on the total number of results
      totalPages.value = Math.ceil(found / resultsPerPage.value);
    } else {
      console.error("No Results Found");
    }
  } catch (error) {
    console.error("Error performing multi-search:", error);
  }
}

// Fetch Unique Cities
const getUniqueCities = async () => {
  try {
    const response = await $typesense
      .collections("products_old")
      .documents()
      .search({
        q: "*",
        query_by: "tour_city.name",
        group_by: "tour_city.name",
        per_page: 100,
      });

    if (response?.grouped_hits[0]?.hits) {
      const tempUniqueCities = response?.grouped_hits[0]?.hits?.map(
        (hit) => hit.document.tour_city.name
      );
      const uniqueSet = [...new Set(tempUniqueCities)];
      uniqueCities.value = uniqueSet.map((item) => {
        return {
          label: item,
          value: item,
        };
      });
    }
  } catch (error) {
    console.error("Error fetching unique cities:", error);
  }
};

// Pagination Methods
const goToNextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value += 1;
    handleInputs();
  }
};

const goToPreviousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value -= 1;
    handleInputs();
  }
};

const { data, error } = useAsyncData("multi-search", async () => {
  await getUniqueCities();
  return true;
});
</script>
