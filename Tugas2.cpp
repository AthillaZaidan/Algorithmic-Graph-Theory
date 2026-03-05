#include <iostream>
#include <vector>
#include <queue>
#include <iomanip>
#include <string>
#include <algorithm>

using namespace std;


vector<vector<int>> adj;
vector<bool> visited;
int N, M;

void printHeader(string title) {
    cout << "\033[1;36m\n================================================" << endl;
    cout << "  " << title << endl;
    cout << "================================================\033[0m" << endl;
}

void dfsGraph(int u, vector<int>& nodes) {
    visited[u] = true;
    nodes.push_back(u);
    for (int v : adj[u]) {
        if (!visited[v]) dfsGraph(v, nodes);
    }
}

void bfsGrid(int r, int c, vector<vector<char>>& grid, vector<vector<bool>>& vis) {
    int n = grid.size();
    int m = grid[0].size();
    queue<pair<int, int>> q;
    q.push({r, c});
    vis[r][c] = true;

    int dr[] = {-1, 1, 0, 0};
    int dc[] = {0, 0, -1, 1};

    while (!q.empty()) {
        pair<int, int> curr = q.front();
        q.pop();

        for (int i = 0; i < 4; i++) {
            int nr = curr.first + dr[i];
            int nc = curr.second + dc[i];
            if (nr >= 0 && nr < n && nc >= 0 && nc < m && grid[nr][nc] == '*' && !vis[nr][nc]) {
                vis[nr][nc] = true;
                q.push({nr, nc});
            }
        }
    }
}

int main() {
    int pilihan;
    printHeader("       TUGAS 2     ");
    cout << "1. Hitung Jumlah Komponen" << endl;
    cout << "2. Cari Komponen Terbesar" << endl;
    cout << "3. Hitung Jumlah Island (Grid '*' dan '.')" << endl;
    cout << "\nPilih opsi (1-3): ";
    cin >> pilihan;

    if (pilihan == 1 || pilihan == 2) {
        cout << "\nInput jumlah Node (N) dan Edge (M): ";
        cin >> N >> M;
        adj.assign(N + 1, vector<int>());
        visited.assign(N + 1, false);

        cout << "Input " << M << " pasang sisi (u v):" << endl;
        for (int i = 0; i < M; i++) {
            int u, v;
            cin >> u >> v;
            if (u <= N && v <= N) {
                adj[u].push_back(v);
                adj[v].push_back(u);
            }
        }

        vector<vector<int>> allComponents;
        for (int i = 1; i <= N; i++) {
            if (!visited[i]) {
                vector<int> currentNodes;
                dfsGraph(i, currentNodes);
                allComponents.push_back(currentNodes);
            }
        }

        printHeader("DETAIL HASIL ANALISIS");
        
        if (pilihan == 1) {
            cout << "Ditemukan \033[1;33m" << allComponents.size() << "\033[0m Komponen Terhubung:\n" << endl;
            for (int i = 0; i < allComponents.size(); i++) {
                cout << " Komponen [" << i + 1 << "] (" << allComponents[i].size() << " node): ";
                cout << "\033[1;32m{ ";
                for (int node : allComponents[i]) cout << node << " ";
                cout << "}\033[0m" << endl;
            }
        } else {
            // Cari komponen dengan size terbesar
            int maxIdx = 0;
            for (int i = 1; i < allComponents.size(); i++) {
                if (allComponents[i].size() > allComponents[maxIdx].size()) maxIdx = i;
            }

            cout << "Komponen Terbesar Adalah:\n" << endl;
            cout << " > ID Komponen   : " << maxIdx + 1 << endl;
            cout << " > Total Node    : " << allComponents[maxIdx].size() << endl;
            cout << " > Daftar Node   : \033[1;32m{ ";
            for (int node : allComponents[maxIdx]) cout << node << " ";
            cout << "}\033[0m" << endl;
        }

    } else if (pilihan == 3) {
        cout << "\nInput Panjang (N) dan Lebar (M) Grid: ";
        cin >> N >> M;
        vector<vector<char>> grid(N, vector<char>(M));
        vector<vector<bool>> vis(N, vector<bool>(M, false));

        cout << "Input isi grid (baris demi baris):" << endl;
        for (int i = 0; i < N; i++) {
            for (int j = 0; j < M; j++) cin >> grid[i][j];
        }

        int islandCount = 0;
        for (int i = 0; i < N; i++) {
            for (int j = 0; j < M; j++) {
                if (grid[i][j] == '*' && !vis[i][j]) {
                    islandCount++;
                    bfsGrid(i, j, grid, vis);
                }
            }
        }

        printHeader("HASIL ANALISIS GRID");
        cout << "Peta Area:" << endl;
        for (int i = 0; i < N; i++) {
            cout << "  ";
            for (int j = 0; j < M; j++) {
                if (grid[i][j] == '*') cout << "\033[1;32m * \033[0m "; 
                else cout << "\033[1;34m . \033[0m "; 
            }
            cout << endl;
        }
        cout << "\n > Total Island Ditemukan: \033[1;33m" << islandCount << "\033[0m" << endl;
    }

    cout << "\033[1;36m\n================================================\033[0m" << endl;
    return 0;
}



//        
