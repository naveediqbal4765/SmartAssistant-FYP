import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FileText, Upload, Trash2, Eye, ArrowLeft, Plus, X, Loader } from 'lucide-react';

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
        setError('Failed to load documents');
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
      setError('Please enter a document title');
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
        setSuccess('✅ Document uploaded successfully!');
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
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/user/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('✅ Document deleted');
      fetchDocuments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete document');
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-gray-500">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <button 
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-blue-600 mb-6 hover:underline"
        >
          <ArrowLeft size={24} /> Back to Profile
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <FileText size={28} className="text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Digital Document Vault</h1>
                <p className="text-gray-500">Store your medical records & prescriptions securely</p>
              </div>
            </div>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition"
            >
              {showUpload ? <X size={20} /> : <Plus size={20} />}
              {showUpload ? 'Cancel' : 'Upload'}
            </button>
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4 text-center">
              {success}
            </div>
          )}

          {/* Upload Form */}
          {showUpload && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6 border-2 border-dashed border-gray-300">
              <h3 className="font-semibold text-lg mb-4">Upload New Document</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Document Title *"
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
                
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader className="animate-spin h-5 w-5" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      Upload Document
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Documents List */}
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-lg">No documents yet</p>
              <p className="text-gray-400">Click "Upload" to add your medical reports and prescriptions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:shadow-md transition">
                  <div className="flex items-center gap-3 flex-1">
                    <FileText size={28} className="text-indigo-500" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{doc.title}</p>
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
              🔒 Your documents are stored securely. Max file size: 5MB per file.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}