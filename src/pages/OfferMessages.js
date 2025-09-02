import React, { useState, useEffect } from 'react';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Card, 
  CardContent, 
  CardActions, 
  Grid,
  Snackbar,
  Alert,
  Box,
  IconButton
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';

const OfferMessages = () => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState({ id: '', text: '', order: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const messagesCollection = collection(db, 'offerMessages');

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const snapshot = await getDocs(messagesCollection);
      const loadedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => a.order - b.order);
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      showSnackbar('Failed to load messages', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentMessage.text.trim()) return;

    try {
      if (isEditing) {
        await setDoc(doc(db, 'offerMessages', currentMessage.id), {
          text: currentMessage.text,
          order: currentMessage.order
        });
        showSnackbar('Message updated successfully', 'success');
      } else {
        const newMessage = {
          text: currentMessage.text,
          order: messages.length > 0 ? Math.max(...messages.map(m => m.order)) + 1 : 1,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(messagesCollection), newMessage);
        showSnackbar('Message added successfully', 'success');
      }
      
      setCurrentMessage({ id: '', text: '', order: 0 });
      setIsEditing(false);
      loadMessages();
    } catch (error) {
      console.error('Error saving message:', error);
      showSnackbar('Failed to save message', 'error');
    }
  };

  const handleEdit = (message) => {
    setCurrentMessage({ ...message });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await deleteDoc(doc(db, 'offerMessages', id));
        showSnackbar('Message deleted successfully', 'success');
        loadMessages();
      } catch (error) {
        console.error('Error deleting message:', error);
        showSnackbar('Failed to delete message', 'error');
      }
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>
          {isEditing ? 'Edit' : 'Add New'} Offer Message
        </Typography>
        
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                label="Offer Message"
                value={currentMessage.text}
                onChange={(e) => setCurrentMessage({...currentMessage, text: e.target.value})}
                margin="normal"
                required
              />
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                {isEditing && (
                  <Button 
                    variant="outlined" 
                    onClick={() => {
                      setIsEditing(false);
                      setCurrentMessage({ id: '', text: '', order: 0 });
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                >
                  {isEditing ? 'Update' : 'Add'} Message
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
          Current Offer Messages
        </Typography>
        
        <Grid container spacing={3}>
          {messages.map((message) => (
            <Grid item xs={12} key={message.id}>
              <Card>
                <CardContent>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                    {message.text}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  <IconButton 
                    color="primary" 
                    onClick={() => handleEdit(message)}
                    aria-label="edit"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    color="error" 
                    onClick={() => handleDelete(message.id)}
                    aria-label="delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
          
          {messages.length === 0 && (
            <Grid item xs={12}>
              <Typography variant="body1" color="textSecondary" align="center" sx={{ py: 4 }}>
                No offer messages found. Add your first message above.
              </Typography>
            </Grid>
          )}
        </Grid>
      </Box>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default OfferMessages;
