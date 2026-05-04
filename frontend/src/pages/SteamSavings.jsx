import { useEffect, useMemo, useState } from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import AnimatedSection from "../components/AnimatedSection";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";

const columns = [
  { id: "number", label: "Number", numeric: true },
  { id: "name", label: "Name" },
  { id: "releaseDate", label: "Release Date" },
  { id: "priceZar", label: "Price in ZAR", numeric: true },
  { id: "priceEur", label: "Price in EUR", numeric: true },
  { id: "convertedZarEur", label: "Converted ZAR -> EUR", numeric: true },
  { id: "differenceEur", label: "Difference in EUR", numeric: true },
  { id: "discountPercent", label: "Discount %", numeric: true },
];

function formatCurrency(value, currency) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value) {
  if (value === null || value === undefined) return "-";
  return `${Number(value).toFixed(1)}%`;
}

function compareRows(a, b, orderBy) {
  const column = columns.find((item) => item.id === orderBy);
  const first = sortValue(a, orderBy, column);
  const second = sortValue(b, orderBy, column);
  if (first === second) return 0;
  if (typeof first === "number" && typeof second === "number") return first - second;
  return String(first).localeCompare(String(second), undefined, { numeric: true, sensitivity: "base" });
}

function releaseDateSortValue(value) {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value.replace(/,/g, ""));
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

function sortValue(row, orderBy, column) {
  const value = row[orderBy];
  if (orderBy === "releaseDate") return releaseDateSortValue(value);
  if (value !== null && value !== undefined && value !== "") return value;
  return column?.numeric ? Number.NEGATIVE_INFINITY : "";
}

export default function SteamSavings() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [query, setQuery] = useState("");
  const [orderBy, setOrderBy] = useState("discountPercent");
  const [order, setOrder] = useState("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSavings = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/steam-savings");
      setRows((data.rows || []).map((row) => ({
        ...row,
        name: decodeDisplayText(row.name),
        releaseDate: decodeDisplayText(row.releaseDate),
      })));
      setSummary(data.summary || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSavings();
  }, []);

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((row) => row.name.toLowerCase().includes(needle))
      : rows;
    return [...filtered].sort((a, b) => {
      const result = compareRows(a, b, orderBy);
      return order === "asc" ? result : -result;
    }).map((row, index) => ({ ...row, rank: index + 1 }));
  }, [order, orderBy, query, rows]);

  const sortBy = (columnId) => {
    if (orderBy === columnId) {
      setOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(columnId);
      setOrder("asc");
    }
  };

  return (
    <Stack spacing={4}>
      <AnimatedSection>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "flex-end" }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h1" color="blog.subheading">Games</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 760 }}>
              Owned games compared between the Spanish Steam store and South African Steam store.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={loadSavings} disabled={loading}>
            Refresh
          </Button>
        </Stack>
      </AnimatedSection>

      {summary && (
        <AnimatedSection delay={80}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: "999px", minWidth: 220, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">Total discount</Typography>
              <Typography variant="h2">{formatCurrency(summary.totalDiscountEur, "EUR")}</Typography>
            </Paper>
            <Paper elevation={0} sx={{ p: 3, borderRadius: "999px", minWidth: 220, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">Discount percentage</Typography>
              <Typography variant="h2">{Number(summary.totalDiscountPercent || 0).toFixed(1)}%</Typography>
            </Paper>
            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
              <Chip label={`${summary.gameCount} games`} variant="outlined" />
              <Chip label={`ZAR -> EUR ${Number(summary.zarToEurRate || 0).toFixed(4)}`} variant="outlined" />
              <Chip label={`Updated ${new Date(summary.refreshedAt).toLocaleString()}`} variant="outlined" />
            </Box>
          </Stack>
        </AnimatedSection>
      )}

      <AnimatedSection delay={120}>
        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2.5}>
            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for a game"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            {error && <Alert severity="error">{error}</Alert>}
            {loading ? (
              <Box sx={{ display: "grid", placeItems: "center", minHeight: 220 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: 680 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {columns.map((column) => (
                        <TableCell key={column.id} align={column.numeric ? "right" : "left"}>
                          <TableSortLabel
                            active={orderBy === column.id}
                            direction={orderBy === column.id ? order : "asc"}
                            onClick={() => sortBy(column.id)}
                          >
                            {column.label}
                          </TableSortLabel>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleRows.map((row) => (
                      <TableRow key={row.appid} hover>
                        <TableCell align="right">{row.rank}</TableCell>
                        <TableCell sx={{ minWidth: 220, fontWeight: 800 }}>
                          <Link
                            href={`https://store.steampowered.com/app/${row.appid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            underline="hover"
                            color="inherit"
                          >
                            {row.name}
                          </Link>
                        </TableCell>
                        <TableCell>{row.releaseDate || "-"}</TableCell>
                        <TableCell align="right">{formatCurrency(row.priceZar, "ZAR")}</TableCell>
                        <TableCell align="right">{formatCurrency(row.priceEur, "EUR")}</TableCell>
                        <TableCell align="right">{formatCurrency(row.convertedZarEur, "EUR")}</TableCell>
                        <TableCell align="right">{formatCurrency(row.differenceEur, "EUR")}</TableCell>
                        <TableCell align="right">{formatPercent(row.discountPercent)}</TableCell>
                      </TableRow>
                    ))}
                    {!visibleRows.length && (
                      <TableRow>
                        <TableCell colSpan={columns.length}>
                          <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                            No games found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </Paper>
      </AnimatedSection>
    </Stack>
  );
}
