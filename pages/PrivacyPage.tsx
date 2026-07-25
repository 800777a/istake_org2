import React from 'react';
import MarkdownDocViewer from '../src/components/MarkdownDocViewer';

const PrivacyPage = () => {
    return (
        <div className="bg-white min-h-screen">
            <MarkdownDocViewer 
                titleKey="privacy_title" 
                docIdKey="privacy_doc_id" 
                defaultDocId="privacy"
            />
        </div>
    );
};

export default PrivacyPage;
