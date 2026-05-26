import { useMemo, useState } from "react";
import CasinoIcon from "@mui/icons-material/Casino";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
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

const ROLE_COUNTS = {
  5: { good: 3, evil: 2 },
  6: { good: 4, evil: 2 },
  7: { good: 4, evil: 3 },
  8: { good: 5, evil: 3 },
  9: { good: 6, evil: 3 },
  10: { good: 6, evil: 4 },
};

const QUEST_SIZES = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

function parseNames(namesText) {
  return namesText
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean);
}

function shuffle(items) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
}

function buildRoles(playerCount) {
  const counts = ROLE_COUNTS[playerCount];
  return shuffle([
    { role: "Merlin", team: "good" },
    ...Array.from({ length: counts.good - 1 }, () => ({ role: "Servant of Arthur", team: "good" })),
    { role: "Assassin", team: "evil" },
    ...Array.from({ length: counts.evil - 1 }, () => ({ role: "Minion of Mordred", team: "evil" })),
  ]);
}

function resultCounts(results) {
  return {
    success: results.filter((result) => result === "success").length,
    fail: results.filter((result) => result === "fail").length,
  };
}

export default function Avalon() {
  const [namesText, setNamesText] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [revealedIds, setRevealedIds] = useState([]);
  const [openRoleId, setOpenRoleId] = useState(null);
  const [questResults, setQuestResults] = useState([null, null, null, null, null]);
  const [currentQuestIndex, setCurrentQuestIndex] = useState(0);
  const [rejectedVotes, setRejectedVotes] = useState(0);
  const [selectedQuestPlayerIds, setSelectedQuestPlayerIds] = useState([]);
  const [activeQuestPlayerId, setActiveQuestPlayerId] = useState(null);
  const [questChoices, setQuestChoices] = useState({});
  const [phase, setPhase] = useState("setup");
  const [winner, setWinner] = useState(null);
  const [assassinPick, setAssassinPick] = useState(null);
  const [error, setError] = useState("");

  const playerNames = useMemo(() => parseNames(namesText), [namesText]);
  const playerCount = assignments.length || playerNames.length;
  const counts = ROLE_COUNTS[playerCount];
  const questSizes = QUEST_SIZES[playerCount] || [];
  const seenCount = revealedIds.length;
  const allRolesSeen = assignments.length > 0 && seenCount === assignments.length;
  const totals = resultCounts(questResults);
  const goodTargets = assignments.filter((assignment) => assignment.team === "good");
  const currentQuestSize = questSizes[currentQuestIndex] || 0;
  const selectedQuestPlayers = assignments.filter((assignment) => selectedQuestPlayerIds.includes(assignment.id));
  const activeQuestPlayer = assignments.find((assignment) => assignment.id === activeQuestPlayerId);
  const submittedQuestCards = Object.keys(questChoices).length;
  const questTeamLocked = submittedQuestCards > 0;
  const questFailThreshold = playerCount >= 7 && currentQuestIndex === 3 ? 2 : 1;
  const currentQuestNeedsTwoFails = questFailThreshold === 2;

  const resetRoundState = () => {
    setQuestResults([null, null, null, null, null]);
    setCurrentQuestIndex(0);
    setRejectedVotes(0);
    setSelectedQuestPlayerIds([]);
    setActiveQuestPlayerId(null);
    setQuestChoices({});
    setWinner(null);
    setAssassinPick(null);
  };

  const startGame = () => {
    const names = parseNames(namesText);
    const uniqueNames = new Set(names.map((name) => name.toLowerCase()));
    if (names.length < 5 || names.length > 10) {
      setError("Avalon needs 5 to 10 players.");
      return;
    }
    if (uniqueNames.size !== names.length) {
      setError("Each player needs a unique name.");
      return;
    }
    const roles = buildRoles(names.length);
    setAssignments(names.map((playerName, index) => ({ id: `${index}-${playerName}`, playerName, ...roles[index] })));
    setRevealedIds([]);
    setOpenRoleId(null);
    resetRoundState();
    setPhase("reveal");
    setError("");
  };

  const startOver = () => {
    setAssignments([]);
    setRevealedIds([]);
    setOpenRoleId(null);
    resetRoundState();
    setPhase("setup");
    setError("");
  };

  const revealRole = (assignmentId) => {
    if (openRoleId === assignmentId) {
      const nextSeen = revealedIds.includes(assignmentId) ? revealedIds : [...revealedIds, assignmentId];
      setRevealedIds(nextSeen);
      setOpenRoleId(null);
      if (nextSeen.length === assignments.length) setPhase("board");
      return;
    }
    if (openRoleId) return;
    setOpenRoleId(assignmentId);
  };

  const rejectTeam = () => {
    if (winner || phase === "assassin" || phase === "finished") return;
    const nextRejectedVotes = rejectedVotes + 1;
    setSelectedQuestPlayerIds([]);
    setActiveQuestPlayerId(null);
    setQuestChoices({});
    if (nextRejectedVotes >= 5) {
      setRejectedVotes(5);
      setWinner("evil");
      setPhase("finished");
      return;
    }
    setRejectedVotes(nextRejectedVotes);
  };

  const clearQuestTeam = () => {
    setSelectedQuestPlayerIds([]);
    setActiveQuestPlayerId(null);
    setQuestChoices({});
  };

  const recordQuest = (result) => {
    if (winner || phase === "assassin" || phase === "finished") return;
    const nextResults = questResults.map((current, index) => (index === currentQuestIndex ? result : current));
    const nextTotals = resultCounts(nextResults);
    setQuestResults(nextResults);
    setRejectedVotes(0);
    clearQuestTeam();
    if (nextTotals.fail >= 3) {
      setWinner("evil");
      setPhase("finished");
      return;
    }
    if (nextTotals.success >= 3) {
      setPhase("assassin");
      return;
    }
    setCurrentQuestIndex((current) => Math.min(current + 1, 4));
    setPhase("board");
  };

  const toggleQuestPlayer = (assignmentId) => {
    if (winner || phase === "assassin" || phase === "finished" || questTeamLocked) return;
    setSelectedQuestPlayerIds((current) => {
      if (current.includes(assignmentId)) return current.filter((id) => id !== assignmentId);
      if (current.length >= currentQuestSize) return current;
      return [...current, assignmentId];
    });
  };

  const submitQuestCard = (choice) => {
    if (!activeQuestPlayer || questChoices[activeQuestPlayer.id]) return;
    const nextChoices = { ...questChoices, [activeQuestPlayer.id]: choice };
    setQuestChoices(nextChoices);
    setActiveQuestPlayerId(null);
    if (Object.keys(nextChoices).length === currentQuestSize) {
      const failCards = Object.values(nextChoices).filter((value) => value === "fail").length;
      recordQuest(failCards >= questFailThreshold ? "fail" : "success");
    }
  };

  const chooseMerlin = (assignment) => {
    if (phase !== "assassin") return;
    setAssassinPick(assignment);
    setWinner(assignment.role === "Merlin" ? "evil" : "good");
    setPhase("finished");
  };

  const teamSx = (team) => ({
    borderColor: team === "good" ? "rgba(63, 193, 201, 0.55)" : "rgba(239, 98, 108, 0.55)",
    bgcolor: team === "good" ? "rgba(63, 193, 201, 0.10)" : "rgba(239, 98, 108, 0.10)",
  });
  const wrapSx = { minWidth: 0, maxWidth: "100%", overflowWrap: "anywhere", wordBreak: "break-word" };
  const panelSx = {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
  };

  return (
    <Stack spacing={4} sx={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "hidden" }}>
      <AnimatedSection sx={{ width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "flex-end" }} sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
          <Box sx={{ flex: 1, width: "100%", minWidth: 0, maxWidth: { xs: "calc(100vw - 64px)", sm: 760 } }}>
            <Typography variant="h1" color="blog.subheading" sx={wrapSx}>Avalon</Typography>
            <Typography color="text.secondary" sx={wrapSx}>
              Generate roles and track quests.
            </Typography>
          </Box>
          {assignments.length > 0 && (
            <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={startOver}>
              Start over
            </Button>
          )}
        </Stack>
      </AnimatedSection>

      <AnimatedSection delay={60}>
        <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, maxWidth: 840, ...panelSx }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h2" color="blog.subheading" sx={wrapSx}>Players</Typography>
              <Typography color="text.secondary" sx={wrapSx}>Enter one player per line. Names stay here for quick replays.</Typography>
            </Box>
            <TextField
              label="Player names"
              value={namesText}
              onChange={(event) => setNamesText(event.target.value)}
              placeholder={"Runi\nVincent\nAlice\nBob\nCharlie"}
              multiline
              minRows={5}
              disabled={phase !== "setup"}
              helperText={`${playerNames.length || 0}/10 players`}
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
              <Button variant="contained" startIcon={<CasinoIcon />} onClick={startGame}>
                Generate roles
              </Button>
              {counts && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`${counts.good} good`} color="info" variant="outlined" />
                  <Chip label={`${counts.evil} evil`} color="error" variant="outlined" />
                </Stack>
              )}
            </Stack>
          </Stack>
        </Paper>
      </AnimatedSection>

      {assignments.length > 0 && (
        <>
          <AnimatedSection delay={90}>
            <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, ...panelSx }}>
              <Stack spacing={2.5}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} justifyContent="space-between">
                  <Box>
                    <Typography variant="h2" color="blog.subheading">Role cards</Typography>
                    <Typography color="text.secondary">{seenCount}/{assignments.length} roles viewed</Typography>
                  </Box>
                  <Chip label={allRolesSeen ? "All roles seen" : "Only tap your own name"} variant="outlined" />
                </Stack>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
                    gap: 2,
                  }}
                >
                  {assignments.map((assignment) => {
                    const seen = revealedIds.includes(assignment.id);
                    const open = openRoleId === assignment.id;
                    return (
                      <Paper
                        key={assignment.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          minHeight: 150,
                          boxShadow: "none",
                          opacity: seen ? 0.58 : 1,
                          transition: "opacity 180ms ease, transform 180ms ease",
                          ...(open ? teamSx(assignment.team) : {}),
                        }}
                      >
                        {open ? (
                          <Stack spacing={1.5} sx={{ height: "100%" }}>
                            <Typography variant="h3" sx={{ overflowWrap: "anywhere" }}>{assignment.playerName}</Typography>
                            <Box>
                              <Chip label={assignment.team === "good" ? "Servants of Arthur" : "Minions of Mordred"} color={assignment.team === "good" ? "info" : "error"} />
                              <Typography variant="h2" sx={{ mt: 1.5, color: assignment.team === "good" ? "info.main" : "error.main" }}>
                                {assignment.role}
                              </Typography>
                            </Box>
                            <Button variant="outlined" onClick={() => revealRole(assignment.id)} sx={{ mt: "auto" }}>
                              Hide role
                            </Button>
                          </Stack>
                        ) : (
                          <Button
                            fullWidth
                            onClick={() => revealRole(assignment.id)}
                            startIcon={<VisibilityIcon />}
                            disabled={seen || Boolean(openRoleId)}
                            sx={{
                              height: "100%",
                              minHeight: 116,
                              justifyContent: "flex-start",
                              textAlign: "left",
                              color: "text.primary",
                              borderRadius: 2,
                              overflowWrap: "anywhere",
                            }}
                          >
                            <Stack alignItems="flex-start" spacing={0.75}>
                              <Typography variant="h3" sx={{ overflowWrap: "anywhere" }}>{assignment.playerName}</Typography>
                              {seen && <Typography variant="caption" color="text.secondary">Viewed</Typography>}
                            </Stack>
                          </Button>
                        )}
                      </Paper>
                    );
                  })}
                </Box>
              </Stack>
            </Paper>
          </AnimatedSection>

          <AnimatedSection delay={120}>
            <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, ...panelSx }}>
              <Stack spacing={3}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} justifyContent="space-between">
                  <Box>
                    <Typography variant="h2" color="blog.subheading">Quest board</Typography>
                    <Typography color="text.secondary">
                      {playerCount >= 7 ? "Quest 4 needs two fails to fail." : "Each quest fails with one fail card."}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={`Good ${totals.success}/3`} color="info" variant="outlined" />
                    <Chip label={`Evil ${totals.fail}/3`} color="error" variant="outlined" />
                  </Stack>
                </Stack>

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(5, minmax(0, 1fr))" }, gap: 1.5 }}>
                  {questSizes.map((teamSize, index) => {
                    const result = questResults[index];
                    const current = index === currentQuestIndex && !winner && phase !== "assassin";
                    const needsTwoFails = playerCount >= 7 && index === 3;
                    return (
                      <Paper
                        key={index}
                        variant="outlined"
                        sx={{
                          p: 2,
                          textAlign: "center",
                          boxShadow: "none",
                          borderWidth: current ? 2 : 1,
                          borderColor: result === "success" ? "info.main" : result === "fail" ? "error.main" : current ? "secondary.main" : "divider",
                          bgcolor: result === "success" ? "rgba(63, 193, 201, 0.10)" : result === "fail" ? "rgba(239, 98, 108, 0.10)" : "transparent",
                        }}
                      >
                        <Typography variant="h3">Quest {index + 1}</Typography>
                        <Typography color="text.secondary">{teamSize} players</Typography>
                        {needsTwoFails && (
                          <Chip size="small" label="2 fails to fail" color="warning" variant="outlined" sx={{ mt: 1 }} />
                        )}
                        <Chip
                          size="small"
                          label={result ? (result === "success" ? "Passed" : "Failed") : current ? "Current" : "Waiting"}
                          color={result === "success" ? "info" : result === "fail" ? "error" : current ? "secondary" : "default"}
                          variant={result || current ? "filled" : "outlined"}
                          sx={{ mt: 1, ml: needsTwoFails ? 0.75 : 0 }}
                        />
                      </Paper>
                    );
                  })}
                </Box>

                <Divider />

                {phase === "assassin" ? (
                  <Stack spacing={2}>
                    <Alert severity="warning">Good completed three quests. The Assassin now picks who they think is Merlin.</Alert>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" }, gap: 1.5 }}>
                      {goodTargets.map((assignment) => (
                        <Button key={assignment.id} variant="outlined" color="error" onClick={() => chooseMerlin(assignment)}>
                          {assignment.playerName}
                        </Button>
                      ))}
                    </Box>
                  </Stack>
                ) : winner ? (
                  <Alert severity={winner === "good" ? "info" : "error"}>
                    {winner === "good" ? "Good wins. Merlin survived." : assassinPick ? `Evil wins. ${assassinPick.playerName} was Merlin.` : "Evil wins."}
                  </Alert>
                ) : (
                  <Stack spacing={2.5}>
                    <Box>
                      <Typography variant="h3">Rejected teams</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        {Array.from({ length: 5 }, (_, index) => (
                          <Box
                            key={index}
                            sx={{
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              border: "1px solid",
                              borderColor: index < rejectedVotes ? "error.main" : "divider",
                              bgcolor: index < rejectedVotes ? "error.main" : "transparent",
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>

                    <Stack spacing={1.5}>
                      <Box>
                        <Typography variant="h3">Quest {currentQuestIndex + 1} team</Typography>
                        <Typography color="text.secondary" sx={wrapSx}>
                          Select {currentQuestSize} players for this quest. The team locks once any quest card is submitted.
                        </Typography>
                        {currentQuestNeedsTwoFails && (
                          <Alert severity="warning" sx={{ mt: 1.5 }}>
                            This quest only fails if two or more Fail cards are played.
                          </Alert>
                        )}
                      </Box>
                      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }, gap: 1 }}>
                        {assignments.map((assignment) => {
                          const selected = selectedQuestPlayerIds.includes(assignment.id);
                          return (
                            <Button
                              key={assignment.id}
                              variant={selected ? "contained" : "outlined"}
                              color={selected ? "secondary" : "primary"}
                              disabled={questTeamLocked || (!selected && selectedQuestPlayerIds.length >= currentQuestSize)}
                              onClick={() => toggleQuestPlayer(assignment.id)}
                              sx={{ justifyContent: "flex-start", overflowWrap: "anywhere" }}
                            >
                              {assignment.playerName}
                            </Button>
                          );
                        })}
                      </Box>
                    </Stack>

                    {selectedQuestPlayerIds.length === currentQuestSize && (
                      <Stack spacing={1.5}>
                        <Box>
                          <Typography variant="h3">Quest cards</Typography>
                          <Typography color="text.secondary" sx={wrapSx}>
                            Pass the phone to each selected player and tap their name. The result appears after every selected player has chosen.
                          </Typography>
                        </Box>
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" }, gap: 1 }}>
                          {selectedQuestPlayers.map((assignment) => {
                            const submitted = Boolean(questChoices[assignment.id]);
                            return (
                              <Button
                                key={assignment.id}
                                variant={submitted ? "outlined" : "contained"}
                                disabled={submitted}
                                onClick={() => setActiveQuestPlayerId(assignment.id)}
                                sx={{ justifyContent: "flex-start", opacity: submitted ? 0.55 : 1 }}
                              >
                                {assignment.playerName}{submitted ? " submitted" : ""}
                              </Button>
                            );
                          })}
                        </Box>

                        {activeQuestPlayer && !questChoices[activeQuestPlayer.id] && (
                          <Paper variant="outlined" sx={{ p: 2, boxShadow: "none", borderColor: "secondary.main" }}>
                            <Stack spacing={1.5}>
                              <Box>
                                <Typography variant="h3" color="blog.subheading">{activeQuestPlayer.playerName}</Typography>
                                <Typography color="text.secondary">Choose your quest card, then pass the phone back.</Typography>
                              </Box>
                              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                                <Button variant="contained" color="info" onClick={() => submitQuestCard("success")}>Success</Button>
                                {activeQuestPlayer.team === "evil" && (
                                  <Button variant="contained" color="error" onClick={() => submitQuestCard("fail")}>Fail</Button>
                                )}
                              </Stack>
                            </Stack>
                          </Paper>
                        )}
                      </Stack>
                    )}

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                      <Button variant="outlined" color="error" onClick={rejectTeam}>Reject team</Button>
                    </Stack>
                  </Stack>
                )}
              </Stack>
            </Paper>
          </AnimatedSection>
        </>
      )}
    </Stack>
  );
}
