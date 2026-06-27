const SUPABASE_URL = 'https://cgylgdcphkraqcrttpym.supabase.co';
const SUPABASE_KEY = 'sb_publishable_b4kOwdEzwx3ovnYlIqPvTQ_5Lnqa9Iq';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function loadSharedMovies() {

  const params = new URLSearchParams(window.location.search);
  const shareId = params.get("id");

  if (!shareId) {
    document.getElementById("emptyState").style.display = "block";
    return;
  }

  const { data, error } = await supabase
    .from("movies")
    .select("*")
    .eq("share_id", shareId);

  if (error || !data.length) {
    document.getElementById("emptyState").style.display = "block";
    return;
  }

  document.getElementById("totalCount").textContent = data.length;

  const grid = document.getElementById("movieGrid");

  data.forEach(movie => {

    grid.innerHTML += `
      <div class="movie-card">

        <div class="card-poster">

          ${
            movie.poster_url
              ? `<img src="${movie.poster_url}" style="width:100%;height:100%;object-fit:cover">`
              : "🎬"
          }

        </div>

        <div class="card-body">

          <div class="card-title">${movie.title}</div>

          <div class="card-genre">${movie.genre}</div>

          <div class="card-stars">${"★".repeat(movie.rating)}</div>

          <div class="card-notes">${movie.notes || ""}</div>

        </div>

      </div>
    `;

  });

}

loadSharedMovies();
