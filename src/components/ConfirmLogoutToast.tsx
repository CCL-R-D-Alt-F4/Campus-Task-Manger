import React from "react";
import { toast } from "sonner";

interface Props {
  logout: () => Promise<void>;
  toastId: string | number;
}

const ConfirmLogoutToast: React.FC<Props> = ({ logout, toastId }) => (
  <div className="relative z-[9999]">
    {/* Overlay background */}
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

    {/* Toast card */}
    <div className="relative z-[9999] mx-auto max-w-xs p-4">
      <div className="bg-white border border-[#BBDEFB] rounded-xl p-6 shadow-lg text-[#1A237E]">
        <h3 className="font-bold text-lg mb-3 text-[#2196F3]">Confirm Logout</h3>
        <p className="mb-5 text-[#1A237E]">Are you sure you want to sign out?</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => toast.dismiss(toastId)}
            className="px-4 py-2 rounded-lg bg-[#E3F2FD] hover:bg-[#BBDEFB] text-[#1A237E] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              await logout();
              toast.dismiss(toastId);
            }}
            className="px-4 py-2 rounded-lg bg-[#E74C3C] hover:bg-[#C0392B] text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default ConfirmLogoutToast;
