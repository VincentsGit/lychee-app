import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import CasinoIcon from "@mui/icons-material/Casino";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import GroupsIcon from "@mui/icons-material/Groups";
import LockIcon from "@mui/icons-material/Lock";
import RefreshIcon from "@mui/icons-material/Refresh";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AnimatedSection from "../components/AnimatedSection";
import { api } from "../components/api";
import AvalonOffline from "./AvalonOffline";

const avalonApi = (path) => `/api${path}`;

const formatDuration = (seconds = 0) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
};

const formatEventTime = (eventTime, startedAt) => {
  const eventDate = new Date(eventTime);
  const startDate = new Date(startedAt);
  if (Number.isNaN(eventDate.getTime()) || Number.isNaN(startDate.getTime())) return "00:00";
  const elapsedMs = Math.max(0, eventDate.getTime() - startDate.getTime());
  return formatDuration(Math.floor(elapsedMs / 1000));
};

const userName = (user) => user?.displayName || user?.username || "Unknown";

function QuestBoard({ game }) {
  const quests = game?.quests || [];
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(5, minmax(0, 1fr))" }, gap: 1.5 }}>
      {quests.map((quest) => {
        const current = quest.questIndex === game.currentQuestIndex && game.status === "in_progress";
        return (
          <Paper
            key={quest.id}
            variant="outlined"
            sx={{
              p: 1.5,
              textAlign: "center",
              boxShadow: "none",
              borderColor: quest.result === "success" ? "info.main" : quest.result === "fail" ? "error.main" : current ? "secondary.main" : "divider",
              bgcolor: quest.result === "success" ? "rgba(63, 193, 201, 0.10)" : quest.result === "fail" ? "rgba(239, 98, 108, 0.10)" : "transparent",
            }}
          >
            <Typography variant="h3">Quest {quest.questIndex + 1}</Typography>
            <Typography color="text.secondary">{quest.teamSize} players</Typography>
            {quest.failThreshold > 1 && <Chip size="small" color="warning" variant="outlined" label="2 fails to fail" sx={{ mt: 1 }} />}
            <Chip
              size="small"
              label={quest.result ? (quest.result === "success" ? "Passed" : "Failed") : current ? "Current" : "Waiting"}
              color={quest.result === "success" ? "info" : quest.result === "fail" ? "error" : current ? "secondary" : "default"}
              sx={{ mt: 1 }}
            />
          </Paper>
        );
      })}
    </Box>
  );
}

function arrayMove(items, fromIndex, toIndex) {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function formatNameList(names = []) {
  if (!names.length) return "None";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function TimelineEventDetails({ event }) {
  const payload = event.payload || {};
  const detailSx = { display: "block", color: "text.secondary", overflowWrap: "anywhere" };
  if (event.type === "vote_result") {
    return (
      <Stack spacing={0.25} sx={{ mt: 0.5 }}>
        <Typography variant="caption" sx={detailSx}>
          Approved: {formatNameList(payload.approvers || [])}
        </Typography>
        <Typography variant="caption" sx={detailSx}>
          Rejected: {formatNameList(payload.rejectors || [])}
        </Typography>
      </Stack>
    );
  }
  if (event.type === "quest_result") {
    return (
      <Typography variant="caption" sx={detailSx}>
        Cards played: {payload.successCount ?? 0} success, {payload.failCount ?? 0} fail
        {payload.failThreshold > 1 ? ` · needs ${payload.failThreshold} fails to fail` : ""}
      </Typography>
    );
  }
  if (event.type === "team_selected") {
    return (
      <Typography variant="caption" sx={detailSx}>
        Team: {formatNameList(payload.selectedNames || [])}
      </Typography>
    );
  }
  if (event.type === "leader_selected") {
    return (
      <Typography variant="caption" sx={detailSx}>
        Leader: {payload.leaderName || "Randomly chosen"}
      </Typography>
    );
  }
  if (event.type === "game_started") {
    return (
      <Typography variant="caption" sx={detailSx}>
        {Array.isArray(payload.players) ? `${payload.players.length} players joined the game.` : ""}
      </Typography>
    );
  }
  return null;
}

function LobbyRoster({ lobby, isHost, onReorder, onKick }) {
  const [orderedPlayers, setOrderedPlayers] = useState(lobby.players || []);
  const [draggingId, setDraggingId] = useState(null);
  const itemRefs = useRef(new Map());
  const previousRectsRef = useRef(new Map());
  const orderedPlayersRef = useRef(orderedPlayers);
  const dragStateRef = useRef({ id: null, moved: false });
  const ignoreDragTarget = (target) =>
    Boolean(target?.closest?.("button,a,input,textarea,[role='button'],[data-no-drag='true']"));

  useEffect(() => {
    if (!draggingId) {
      setOrderedPlayers(lobby.players || []);
    }
  }, [draggingId, lobby.players]);

  useEffect(() => {
    orderedPlayersRef.current = orderedPlayers;
  }, [orderedPlayers]);

  useLayoutEffect(() => {
    const nextRects = new Map();
    orderedPlayers.forEach((player) => {
      const el = itemRefs.current.get(player.id);
      if (!el) return;
      const nextRect = el.getBoundingClientRect();
      nextRects.set(player.id, nextRect);
      const previousRect = previousRectsRef.current.get(player.id);
      if (!previousRect) return;
      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      if (!deltaX && !deltaY) return;
      el.style.transition = "transform 0s";
      el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      window.requestAnimationFrame(() => {
        el.style.transition = "transform 220ms ease";
        el.style.transform = "";
      });
    });
    previousRectsRef.current = nextRects;
  }, [orderedPlayers]);

  useEffect(() => {
    if (!draggingId) return undefined;

    const moveDraggedPlayer = (targetId) => {
      setOrderedPlayers((current) => {
        const fromIndex = current.findIndex((player) => player.id === dragStateRef.current.id);
        const toIndex = current.findIndex((player) => player.id === targetId);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current;
        dragStateRef.current.moved = true;
        return arrayMove(current, fromIndex, toIndex);
      });
    };

    const onPointerMove = (event) => {
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-player-id]");
      if (!target) return;
      const targetId = Number(target.getAttribute("data-player-id"));
      if (!Number.isFinite(targetId) || targetId === dragStateRef.current.id) return;
      moveDraggedPlayer(targetId);
    };

    const endDrag = async () => {
      const currentId = dragStateRef.current.id;
      const currentOrder = orderedPlayersRef.current.map((player) => player.id);
      const moved = dragStateRef.current.moved;
      dragStateRef.current = { id: null, moved: false };
      setDraggingId(null);
      if (moved && currentId) {
        try {
          await onReorder(currentOrder);
        } catch {
          setOrderedPlayers(lobby.players || []);
        }
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [draggingId, onReorder]);

  const startDrag = (playerId) => (event) => {
    if (!isHost) return;
    if (event.button !== undefined && event.button !== 0) return;
    dragStateRef.current = { id: playerId, moved: false };
    setDraggingId(playerId);
    if (event.currentTarget?.setPointerCapture) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Ignore capture failures on browsers that do not support it for this target.
      }
    }
    event.preventDefault();
  };

  return (
    <Stack spacing={1.25} sx={{ width: "100%" }}>
      {orderedPlayers.map((player) => {
        const selected = draggingId === player.id;
        return (
          <Paper
            key={player.id}
            ref={(node) => {
              if (node) itemRefs.current.set(player.id, node);
              else itemRefs.current.delete(player.id);
            }}
            data-player-id={player.id}
            variant="outlined"
            sx={{
              p: 1.5,
              boxShadow: "none",
              transition: "box-shadow 180ms ease, opacity 180ms ease, transform 180ms ease",
              opacity: selected ? 0.92 : 1,
              borderColor: selected ? "secondary.main" : "divider",
              bgcolor: "background.paper",
              touchAction: "none",
              userSelect: "none",
              cursor: isHost ? "grab" : "default",
            }}
            onPointerDown={(event) => {
              if (!isHost || ignoreDragTarget(event.target)) return;
              startDrag(player.id)(event);
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
              {isHost ? (
                <Box
                  onPointerDown={startDrag(player.id)}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: { xs: 52, sm: 40 },
                    height: { xs: 52, sm: 40 },
                    flex: "0 0 auto",
                    borderRadius: 1.5,
                    cursor: "grab",
                    touchAction: "none",
                    color: "secondary.main",
                    bgcolor: "rgba(173, 116, 245, 0.14)",
                  }}
                >
                  <DragIndicatorIcon />
                </Box>
              ) : (
                <Box sx={{ width: 40, height: 40, flex: "0 0 auto" }} />
              )}
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                  <Typography variant="h3" color="blog.subheading" sx={{ overflowWrap: "anywhere" }}>
                    {userName(player)}
                  </Typography>
                  {player.id === lobby.hostUserId && <Chip size="small" label="Host" color="secondary" />}
                  <Chip size="small" label={player.ready ? "Ready" : "Not ready"} color={player.ready ? "info" : "default"} variant="outlined" />
                  <Chip size="small" label={`${player.mmr || 1000} Elo`} variant="outlined" />
                </Stack>
              </Box>
              {isHost && player.id !== lobby.hostUserId && (
                <Button size="small" color="error" variant="outlined" onClick={() => onKick(player.id)}>
                  Kick
                </Button>
              )}
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}

function OnlineGame({ game, setGame, refreshGame, setError, returnToLobby }) {
  const [selectedTeam, setSelectedTeam] = useState([]);
  const [busy, setBusy] = useState(false);
  const viewer = game.viewer || {};
  const currentQuest = game.currentQuest;
  const realCurrentUserId = viewer.userId;
  const isLeader = viewer.isLeader;
  const selectedIds = currentQuest?.selectedTeam || selectedTeam;
  const selectedPlayers = game.players.filter((player) => selectedIds.includes(player.user.id));
  const myVote = currentQuest?.votes?.find((vote) => vote.userId === realCurrentUserId);
  const myCard = currentQuest?.questCards?.find((card) => card.userId === realCurrentUserId);
  const onQuest = selectedIds.includes(realCurrentUserId);
  const goodTargets = game.assassinTargets || [];
  const successes = game.quests.filter((quest) => quest.result === "success").length;
  const fails = game.quests.filter((quest) => quest.result === "fail").length;

  useEffect(() => {
    setSelectedTeam(currentQuest?.selectedTeam || []);
  }, [currentQuest?.id, currentQuest?.selectedTeam?.join(",")]);

  const postAction = async (path, body = {}) => {
    setBusy(true);
    setError("");
    try {
      const data = await api(avalonApi(path), { method: "POST", body: JSON.stringify(body) });
      if (!data?.game) throw new Error("The game response was empty. Please try again.");
      setGame(data.game);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleTeam = (userId) => {
    if (!currentQuest) return;
    setSelectedTeam((current) => {
      if (current.includes(userId)) return current.filter((id) => id !== userId);
      if (current.length >= currentQuest.teamSize) return current;
      return [...current, userId];
    });
  };

  return (
    <Stack spacing={3}>
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, overflow: "hidden" }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Box>
              <Typography variant="h2" color="blog.subheading">Online game</Typography>
              <Typography color="text.secondary">Timer {formatDuration(game.durationSeconds)} · expires after 24 hours</Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`Good ${successes}/3`} color="info" variant="outlined" />
              <Chip label={`Evil ${fails}/3`} color="error" variant="outlined" />
              <Chip label={`Rejects ${game.rejectedVotes}/5`} color="warning" variant="outlined" />
              <Button size="small" startIcon={<RefreshIcon />} onClick={refreshGame}>Refresh</Button>
            </Stack>
          </Stack>

          <QuestBoard game={game} />

          {game.status !== "in_progress" && (
            <Alert
              severity={game.winner === "good" ? "info" : game.winner === "evil" ? "error" : "warning"}
              action={game.status === "finished" ? <Button color="inherit" size="small" onClick={returnToLobby}>Back to lobby</Button> : null}
            >
              {game.status === "expired" ? "This game expired." : `${game.winner === "good" ? "Good" : "Evil"} wins. The lobby is open again.`}
            </Alert>
          )}

          {game.currentPhase === "roles" && game.status === "in_progress" && (
            <Paper variant="outlined" sx={{ p: 2, boxShadow: "none" }}>
              <Stack spacing={1.5}>
                <Typography variant="h3" color="blog.subheading">Your role</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={viewer.team === "good" ? "Servants of Arthur" : "Minions of Mordred"} color={viewer.team === "good" ? "info" : "error"} />
                  <Chip label={viewer.role} variant="outlined" />
                </Stack>
                <Button variant="contained" disabled={busy || viewer.continuedAfterRole} onClick={() => postAction(`/avalon/games/${game.id}/continue`)}>
                  {viewer.continuedAfterRole ? "Waiting for everyone else" : "Continue"}
                </Button>
              </Stack>
            </Paper>
          )}

          {game.currentPhase === "team_selection" && game.status === "in_progress" && currentQuest && (
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="h3" color="blog.subheading">Team selection</Typography>
                <Typography color="text.secondary">
                  {isLeader ? `Choose ${currentQuest.teamSize} players for Quest ${currentQuest.questIndex + 1}.` : `Waiting for the leader to choose ${currentQuest.teamSize} players.`}
                </Typography>
                {currentQuest.failThreshold > 1 && <Alert severity="warning" sx={{ mt: 1 }}>This quest needs two Fail cards to fail.</Alert>}
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }, gap: 1 }}>
                {game.players.map((player) => {
                  const selected = selectedTeam.includes(player.user.id);
                  return (
                    <Button
                      key={player.user.id}
                      variant={selected ? "contained" : "outlined"}
                      disabled={!isLeader || (!selected && selectedTeam.length >= currentQuest.teamSize)}
                      onClick={() => toggleTeam(player.user.id)}
                      sx={{ justifyContent: "flex-start", overflowWrap: "anywhere" }}
                    >
                      {userName(player.user)}
                    </Button>
                  );
                })}
              </Box>
              {isLeader && (
                <Button
                  variant="contained"
                  disabled={busy || selectedTeam.length !== currentQuest.teamSize}
                  onClick={() => postAction(`/avalon/games/${game.id}/team`, { selectedTeam })}
                >
                  Submit team
                </Button>
              )}
            </Stack>
          )}

          {game.currentPhase === "voting" && game.status === "in_progress" && currentQuest && (
            <Stack spacing={1.5}>
              <Typography variant="h3" color="blog.subheading">Vote on the team</Typography>
              <Typography color="text.secondary">
                {selectedPlayers.map((player) => userName(player.user)).join(", ")} · {currentQuest.votes.length}/{game.playerCount} votes in
              </Typography>
              {myVote ? (
                <Alert severity="info">You voted {myVote.vote}. Waiting for the rest of the table.</Alert>
              ) : (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button variant="contained" color="info" disabled={busy} onClick={() => postAction(`/avalon/games/${game.id}/vote`, { vote: "approve" })}>Approve</Button>
                  <Button variant="contained" color="error" disabled={busy} onClick={() => postAction(`/avalon/games/${game.id}/vote`, { vote: "reject" })}>Reject</Button>
                </Stack>
              )}
            </Stack>
          )}

          {game.currentPhase === "quest_cards" && game.status === "in_progress" && currentQuest && (
            <Stack spacing={1.5}>
              <Typography variant="h3" color="blog.subheading">Quest cards</Typography>
              <Typography color="text.secondary">{currentQuest.questCards.length}/{currentQuest.teamSize} quest cards submitted.</Typography>
              {currentQuest.failThreshold > 1 && <Alert severity="warning">This quest only fails if two or more Fail cards are played.</Alert>}
              {!onQuest ? (
                <Alert severity="info">You are not on this quest. Waiting for the selected players.</Alert>
              ) : myCard ? (
                <Alert severity="info">Your quest card is in. Waiting for the others.</Alert>
              ) : (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button variant="contained" color="info" disabled={busy} onClick={() => postAction(`/avalon/games/${game.id}/quest-card`, { card: "success" })}>Success</Button>
                  {viewer.team === "evil" && (
                    <Button variant="contained" color="error" disabled={busy} onClick={() => postAction(`/avalon/games/${game.id}/quest-card`, { card: "fail" })}>Fail</Button>
                  )}
                </Stack>
              )}
            </Stack>
          )}

          {game.currentPhase === "assassin" && game.status === "in_progress" && (
            <Stack spacing={1.5}>
              <Alert severity="warning">Good completed three quests. The Assassin picks Merlin.</Alert>
              {viewer.role === "Assassin" ? (
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" }, gap: 1 }}>
                  {goodTargets.map((player) => (
                    <Button key={player.id} variant="outlined" color="error" onClick={() => postAction(`/avalon/games/${game.id}/assassin-pick`, { targetUserId: player.id })}>
                      {userName(player)}
                    </Button>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary">Waiting for the Assassin.</Typography>
              )}
            </Stack>
          )}
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Stack spacing={1.5}>
          <Typography variant="h2" color="blog.subheading">Timeline</Typography>
          {(game.events || []).map((event) => (
            <Box key={event.id}>
              <Typography color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                {formatEventTime(event.createdAt, game.startedAt)} · {event.message}
              </Typography>
              <TimelineEventDetails event={event} />
            </Box>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}

function OnlineAvalon({ user }) {
  const [lobbies, setLobbies] = useState([]);
  const [lobby, setLobby] = useState(null);
  const [game, setGame] = useState(null);
  const [resumeSession, setResumeSession] = useState(null);
  const [checkingResume, setCheckingResume] = useState(true);
  const [name, setName] = useState("Avalon lobby");
  const [password, setPassword] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [error, setError] = useState("");
  const isHost = lobby?.hostUserId === user?.id;

  const refreshLobbies = async () => {
    const data = await api(avalonApi("/avalon/lobbies"));
    setLobbies(Array.isArray(data?.lobbies) ? data.lobbies : []);
  };

  const refreshResumeSession = async () => {
    setCheckingResume(true);
    try {
      const data = await api(avalonApi("/avalon/current"));
      if (data?.game) {
        setResumeSession({ type: "game", game: data.game });
      } else if (data?.lobby) {
        setResumeSession({ type: "lobby", lobby: data.lobby });
      } else {
        setResumeSession(null);
      }
    } finally {
      setCheckingResume(false);
    }
  };

  const refreshGame = async () => {
    if (!game?.id) return;
    const data = await api(avalonApi(`/avalon/games/${game.id}`));
    if (!data?.game) throw new Error("The game response was empty. Please try again.");
    setGame(data.game);
  };

  const refreshLobby = async () => {
    if (!lobby?.id) return;
    const data = await api(avalonApi(`/avalon/lobbies/${lobby.id}`));
    if (!data?.lobby) throw new Error("The lobby response was empty. Please try again.");
    if (!data.lobby.players?.some((player) => player.id === user?.id)) {
      setLobby(null);
      await refreshLobbies();
      return;
    }
    setLobby(data.lobby);
    if (data.lobby?.gameId && !game) {
      const gameData = await api(avalonApi(`/avalon/games/${data.lobby.gameId}`));
      if (!gameData?.game) throw new Error("The game response was empty. Please try again.");
      setGame(gameData.game);
    }
  };

  const leaveLobby = async (silent = false) => {
    if (!lobby?.id) return;
    if (!silent) setError("");
    try {
      const data = await api(avalonApi(`/avalon/lobbies/${lobby.id}/leave`), { method: "POST" });
      setLobby(data?.lobby || null);
      setResumeSession(null);
      await refreshLobbies();
    } catch (err) {
      if (!silent) setError(err.message);
    }
  };

  const kickPlayer = async (playerId) => {
    if (!lobby?.id) return;
    setError("");
    try {
      const data = await api(avalonApi(`/avalon/lobbies/${lobby.id}/players/${playerId}/kick`), { method: "POST" });
      setLobby(data?.lobby || null);
      await refreshLobbies();
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    Promise.all([refreshLobbies(), refreshResumeSession()]).catch((err) => {
      setCheckingResume(false);
      setError(err.message);
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (game?.id) refreshGame().catch(() => {});
      else if (lobby?.id) refreshLobby().catch(() => {});
      else refreshLobbies().catch(() => {});
    }, 2000);
    return () => window.clearInterval(timer);
  }, [game?.id, lobby?.id]);

  useEffect(() => {
    if (!lobby?.id || game?.id) return undefined;
    const lobbyId = lobby.id;
    const leaveOnExit = () => {
      fetch(avalonApi(`/avalon/lobbies/${lobbyId}/leave`), {
        method: "POST",
        credentials: "include",
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener("pagehide", leaveOnExit);
    return () => {
      window.removeEventListener("pagehide", leaveOnExit);
      leaveOnExit();
    };
  }, [lobby?.id, game?.id]);

  const post = async (path, body = {}) => {
    setError("");
    try {
      const data = await api(avalonApi(path), { method: "POST", body: JSON.stringify(body) });
      if (data.game) {
        setGame(data.game);
        setResumeSession(null);
      }
      if (data.lobby) {
        setLobby(data.lobby);
        setResumeSession(null);
      }
      if (!data?.game && !data?.lobby) throw new Error("The Avalon response was empty. Please try again.");
      await refreshLobbies();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveLobbyOrder = async (playerIds) => {
    setError("");
    try {
      const data = await api(avalonApi(`/avalon/lobbies/${lobby.id}/order`), {
        method: "POST",
        body: JSON.stringify({ playerIds }),
      });
      if (!data?.lobby) throw new Error("The lobby response was empty. Please try again.");
      setLobby(data.lobby);
      await refreshLobbies();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const resumeAvalon = () => {
    if (resumeSession?.game) {
      setGame(resumeSession.game);
      setLobby(null);
      setResumeSession(null);
    } else if (resumeSession?.lobby) {
      setLobby(resumeSession.lobby);
      setGame(null);
      setResumeSession(null);
    }
  };

  const returnToLobby = async () => {
    setError("");
    try {
      const data = await api(avalonApi("/avalon/current"));
      setGame(null);
      setLobby(data?.lobby || null);
      setResumeSession(null);
      await refreshLobbies();
    } catch (err) {
      setError(err.message);
    }
  };

  const joinedLobby = lobby?.players?.some((player) => player.id === user?.id);
  const readyPlayer = lobby?.players?.find((player) => player.id === user?.id);
  const canStart = lobby && isHost && lobby.players.length >= 5 && lobby.players.every((player) => player.ready);

  if (game) {
    return <OnlineGame game={game} setGame={setGame} refreshGame={refreshGame} setError={setError} returnToLobby={returnToLobby} />;
  }

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}
      {!game && !lobby && resumeSession && (
        <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 } }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Box>
              <Typography variant="h2" color="blog.subheading">
                {resumeSession.type === "game" ? "Resume your game" : "Rejoin your lobby"}
              </Typography>
              <Typography color="text.secondary">
                {resumeSession.type === "game"
                  ? `You are still in an active ${resumeSession.game.currentPhase.replace("_", " ")} phase game.`
                  : `You are still in ${resumeSession.lobby.name}.`}
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={resumeAvalon}>
              {resumeSession.type === "game" ? "Resume game" : "Rejoin lobby"}
            </Button>
          </Stack>
        </Paper>
      )}
      {!game && !lobby && checkingResume && <Alert severity="info">Checking for an active Avalon game...</Alert>}

      {lobby ? (
        <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 } }}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ md: "center" }}>
              <Box>
                <Typography variant="h2" color="blog.subheading">{lobby.name}</Typography>
                <Typography color="text.secondary">
                  {lobby.players.length}/{lobby.maxPlayers} players · {isHost ? "You are host" : `Host: ${userName(lobby.host)}`}
                </Typography>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button startIcon={<RefreshIcon />} onClick={refreshLobby}>Refresh</Button>
                <Button color="error" variant="outlined" onClick={() => leaveLobby()}>Leave lobby</Button>
              </Stack>
            </Stack>

            {isHost && (
              <Alert severity="info">
                Drag the handle to reorder the lobby. The first leader is still random, then leadership follows this order.
              </Alert>
            )}
            <LobbyRoster lobby={lobby} isHost={isHost} onReorder={saveLobbyOrder} onKick={kickPlayer} />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              {joinedLobby && (
                <Button variant="outlined" onClick={() => post(`/avalon/lobbies/${lobby.id}/ready`, { ready: !readyPlayer?.ready })}>
                  {readyPlayer?.ready ? "Mark not ready" : "Ready"}
                </Button>
              )}
              {canStart && <Button variant="contained" startIcon={<CasinoIcon />} onClick={() => post(`/avalon/lobbies/${lobby.id}/start`)}>Start game</Button>}
              {isHost && lobby.players.length < 5 && (
                <Alert severity="info" sx={{ flex: 1 }}>Avalon online needs at least 5 players to start.</Alert>
              )}
            </Stack>
          </Stack>
        </Paper>
      ) : (
        <>
          <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Stack spacing={2}>
              <Typography variant="h2" color="blog.subheading">Create lobby</Typography>
              <TextField label="Lobby name" value={name} onChange={(event) => setName(event.target.value)} />
              <TextField label="Optional password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
              <Button variant="contained" startIcon={<GroupsIcon />} onClick={() => post("/avalon/lobbies", { name, password })}>Create online lobby</Button>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h2" color="blog.subheading">Active lobbies</Typography>
                <Button startIcon={<RefreshIcon />} onClick={refreshLobbies}>Refresh</Button>
              </Stack>
              <Stack spacing={1.5}>
                {lobbies.length ? lobbies.map((item) => (
                  <Paper key={item.id} variant="outlined" sx={{ p: 2, boxShadow: "none" }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
                      <Box>
                        <Typography variant="h3" color="blog.subheading" sx={{ overflowWrap: "anywhere" }}>{item.name}</Typography>
                        <Typography color="text.secondary">
                          Hosted by {userName(item.host)} · {item.playerCount}/{item.maxPlayers} players · {item.status === "in_progress" ? "in game" : "open"}
                        </Typography>
                      </Box>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        {item.hasPassword && item.status === "waiting" && <TextField size="small" label="Password" value={joinPassword} onChange={(event) => setJoinPassword(event.target.value)} type="password" />}
                        <Button
                          variant="outlined"
                          startIcon={item.hasPassword ? <LockIcon /> : null}
                          disabled={item.status !== "waiting"}
                          onClick={() => post(`/avalon/lobbies/${item.id}/join`, { password: joinPassword })}
                        >
                          {item.status === "waiting" ? "Join" : "Locked"}
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                )) : (
                  <Typography color="text.secondary">No active online lobbies yet.</Typography>
                )}
              </Stack>
            </Stack>
          </Paper>
        </>
      )}
    </Stack>
  );
}

function AvalonLeaderboard() {
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api(avalonApi("/avalon/leaderboard"))
      .then((data) => setPlayers(Array.isArray(data?.players) ? data.players : []))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 } }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h2" color="blog.subheading">Leaderboard</Typography>
          <Typography color="text.secondary">Highest ranking Avalon players with at least 5 finished games.</Typography>
        </Box>
        <Stack spacing={1.25}>
          {players.length ? players.map((entry, index) => (
            <Paper key={entry.user.id} variant="outlined" sx={{ p: 1.5, boxShadow: "none" }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: "center" }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Chip label={`#${index + 1}`} color={index < 3 ? "secondary" : "default"} />
                  <Box>
                    <Typography
                      component={RouterLink}
                      to={`/users/${entry.user.id}`}
                      variant="h3"
                      color="blog.subheading"
                      sx={{ textDecoration: "none", overflowWrap: "anywhere" }}
                    >
                      {userName(entry.user)}
                    </Typography>
                    <Typography color="text.secondary">@{entry.user.username}</Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`${entry.mmr} Elo`} color="info" />
                  <Chip label={`${entry.gamesPlayed} games`} variant="outlined" />
                  <Chip label={`${entry.gamesWon}W ${entry.gamesLost}L`} variant="outlined" />
                </Stack>
              </Stack>
            </Paper>
          )) : (
            <Typography color="text.secondary">No ranked Avalon players yet. Players appear here after 5 games.</Typography>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function Avalon({ user }) {
  const [mode, setMode] = useState("offline");
  const loggedIn = Boolean(user?.id);

  const modeCopy = useMemo(() => ({
    offline: "One-phone role reveals and quest tracking.",
    online: "Own-phone roles, votes, quest cards, stats, and history.",
    leaderboard: "Highest ranking Avalon players.",
  }), []);

  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    api(avalonApi("/avalon/current"))
      .then((data) => {
        if (!cancelled && (data?.game || data?.lobby)) setMode("online");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  return (
    <Stack spacing={4} sx={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "hidden", boxSizing: "border-box" }}>
      <AnimatedSection sx={{ width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden" }}>
        <Stack spacing={2} sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
          <Box sx={{ width: "100%", maxWidth: { xs: "calc(100vw - 64px)", sm: 760 }, minWidth: 0 }}>
            <Typography variant="h1" color="blog.subheading" sx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>Avalon</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: "100%", whiteSpace: "normal", overflowWrap: "anywhere", wordBreak: "break-word" }}>
              Play Avalon offline or online.
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button variant={mode === "offline" ? "contained" : "outlined"} startIcon={<RestartAltIcon />} onClick={() => setMode("offline")}>
              Offline
            </Button>
            <Button variant={mode === "online" ? "contained" : "outlined"} startIcon={<GroupsIcon />} disabled={!loggedIn} onClick={() => setMode("online")}>
              Online
            </Button>
            <Button variant={mode === "leaderboard" ? "contained" : "outlined"} startIcon={<CasinoIcon />} onClick={() => setMode("leaderboard")}>
              Leaderboard
            </Button>
          </Stack>
          <Alert severity={mode === "online" ? "info" : "success"} sx={{ maxWidth: { xs: "calc(100vw - 64px)", sm: "100%" }, overflow: "hidden" }}>
            {modeCopy[mode]}
          </Alert>
          {!loggedIn && (
            <Alert severity="warning" sx={{ maxWidth: { xs: "calc(100vw - 64px)", sm: "100%" }, overflow: "hidden" }}>
              Log in to play Avalon online.
            </Alert>
          )}
        </Stack>
      </AnimatedSection>

      <Divider />

      {mode === "leaderboard" ? <AvalonLeaderboard /> : mode === "online" && loggedIn ? <OnlineAvalon user={user} /> : <AvalonOffline />}
    </Stack>
  );
}
