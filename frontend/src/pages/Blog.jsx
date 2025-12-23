import React, { useEffect, useState } from 'react';
import { Container, Typography, List, ListItem, ListItemText, IconButton, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch user info
    fetch('http://localhost:5000/me', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Not authorized');
        return res.json();
      })
      .then(data => setUser(data.user))
      .catch(() => setUser(null));

    // Fetch posts
    fetch('http://localhost:5000/posts', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const sorted = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setPosts(sorted);
      })
      .catch(err => console.error('Failed to fetch posts:', err));
  }, []);

  const handleClick = (id, title) => {
    const urlTitle = encodeURIComponent(title.replace(/\s+/g, '-').toLowerCase());
    navigate(`/blog/${id}/${urlTitle}`);
  };

  const handleEdit = (id) => {
    navigate(`/edit/${id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await fetch(`http://localhost:5000/posts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete post');
      setPosts(posts.filter(post => post.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Group posts by year
  const postsByYear = posts.reduce((acc, post) => {
    const year = new Date(post.createdAt).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(post);
    return acc;
  }, {});
  const years = Object.keys(postsByYear).sort((a, b) => b - a);

  return (
    <Container sx={{ mt: { xs: 0, md: 4 } }}>
      <Typography variant="h2" color="blog.subheading" gutterBottom>
        Blog
      </Typography>

      {years.map(year => (
        <div key={year}>
          <Typography variant="h3" color="blog.subheading" sx={{ mt: 4, mb: 2 }}>
            {year}
          </Typography>
          <List>
            {postsByYear[year].map(post => (
              <ListItem
                key={post.id}
                secondaryAction={
                  user && (
                    <Box>
                      <IconButton edge="end" onClick={() => handleEdit(post.id)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton edge="end" onClick={() => handleDelete(post.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  )
                }
              >
                <ListItemText
                  primary={`${new Date(post.createdAt).toLocaleDateString()} - ${post.title}`}
                  onClick={() => handleClick(post.id, post.title)}
                  sx={{ cursor: 'pointer' }}
                />
              </ListItem>
            ))}
          </List>
        </div>
      ))}
    </Container>
  );
}
