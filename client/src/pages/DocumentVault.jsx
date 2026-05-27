import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FileText, Upload, Trash2, Eye, Plus, X, Loader } from 'lucide-react';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import FeatureCard from '../components/ui/FeatureCard';
import FeaturePage from '../components/ui/FeaturePage';
import LoadingState from '../components/ui/LoadingState';
import StatusAlert from '../components/ui/StatusAlert';

export default function DocumentVault() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [newDocument, setNewDocument] = useState({
    title: '',
    type: 'other',
    notes: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);

  const documentTypes = [
    { value: 'prescription', label: '💊 Prescription' },
    { value: 'report', label: '📊 Medical Report' },
    { value: 'id_card', label: '🪪 ID Card' },
    { value: 'insurance', label: '📄 Insurance' },
    { value: 'other', label: '📎 Other' }
  ];

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get('http://localhost:5000/api/user/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setDocuments(response.data.documents || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError('Failed to load Digital Health Vault files');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File too large. Max 5MB');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!newDocument.title) {
      setError('Please enter a vault item title');
      return;
    }
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('title', newDocument.title);
    formData.append('type', newDocument.type);
    formData.append('notes', newDocument.notes);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/user/documents', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setSuccess('✅ Digital Health Vault item uploaded successfully!');
        setShowUpload(false);
        setNewDocument({ title: '', type: 'other', notes: '' });
        setSelectedFile(null);
        fetchDocuments();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.msg || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.msg || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Digital Health Vault item?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/user/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('✅ Digital Health Vault item deleted');
      fetchDocuments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete Digital Health Vault item');
      setTimeout(() => setError(''), 3000);
    }
  };

  const viewDocument = (fileUrl) => {
    window.open(`http://localhost:5000${fileUrl}`, '_blank');
  };

  const getTypeLabel = (type) => {
    const found = documentTypes.find(t => t.value === type);
    return found ? found.label : '📎 Other';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return <LoadingState label="Loading Digital Health Vault..." />;
  }

  return (
    <FeaturePage
      title="Digital Health Vault"
      description="Store your medical records and prescriptions securely."
      backLabel="Back to Profile"
      onBack={() => navigate('/profile')}
      maxWidth="max-w-4xl"
      actions={(
        <Button onClick={() => setShowUpload(!showUpload)}>
          {showUpload ? <X size={20} /> : <Plus size={20} />}
          {showUpload ? 'Cancel' : 'Upload'}
        </Button>
      )}
    >
        <FeatureCard>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <FileText size={28} className="text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Digital Health Vault</h1>
                <p className="text-gray-500">Store your medical records & prescriptions securely</p>
              </div>
            </div>
          </div>

          <StatusAlert variant="error">{error}</StatusAlert>
          <StatusAlert variant="success">{success}</StatusAlert>

          {/* Upload Form */}
          {showUpload && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6 border-2 border-dashed border-gray-300">
              <h3 className="font-semibold text-lg mb-4">Upload New Vault Item</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Vault Item Title *"
                  value={newDocument.title}
                  onChange={(e) => setNewDocument({...newDocument, title: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                
                <select
                  value={newDocument.type}
                  onChange={(e) => setNewDocument({...newDocument, type: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {documentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                
                <textarea
                  placeholder="Notes (optional)"
                  value={newDocument.notes}
                  onChange={(e) => setNewDocument({...newDocument, notes: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                />
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="hidden"
                    id="fileInput"
                  />
                  <label
                    htmlFor="fileInput"
                    className="cursor-pointer text-indigo-600 hover:text-indigo-700"
                  >
                    <Upload className="inline mr-2" size={20} />
                    {selectedFile ? selectedFile.name : 'Click to select file'}
                  </label>
                  <p className="text-xs text-gray-400 mt-2">Max 5MB. Allowed: PDF, JPG, PNG, DOC</p>
                </div>
                
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <Loader className="animate-spin h-5 w-5" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      Upload to Digital Health Vault
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Digital Health Vault List */}
          {documents.length === 0 ? (
            <EmptyState
              title="No Digital Health Vault items yet"
              description='Click "Upload" to add your medical reports and prescriptions.'
            />
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:shadow-md transition">
                  <div className="flex items-center gap-3 flex-1">
                    <FileText size={28} className="text-indigo-500" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{doc.title}</p>
                      <div className="flex gap-3 text-sm text-gray-500">
                        <span>{getTypeLabel(doc.type)}</span>
                        <span>•</span>
                        <span>{formatDate(doc.createdAt)}</span>
                      </div>
                      {doc.notes && <p className="text-xs text-gray-400 mt-1">{doc.notes}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => viewDocument(doc.fileUrl)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="View"
                    >
                      <Eye size={20} />
                    </button>
                    <button
                      onClick={() => deleteDocument(doc._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-gray-400 text-center">
              🔒 Your Digital Health Vault files are stored securely. Max file size: 5MB per file.
            </p>
          </div>
        </FeatureCard>
    </FeaturePage>
  );
}