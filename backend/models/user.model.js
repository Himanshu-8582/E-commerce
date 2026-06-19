import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const cartItemSchema = new mongoose.Schema(
    {
        quantity: {
          type: Number,
            default: 1,
          min:1,
        },
        product: {
          type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
    },
    {
        _id: false,
    }
)

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                "Please enter a valid email",
            ],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password msut be at least 6 character long"],
        },
        cartItems: [cartItemSchema],
        role: {
            type: String,
            enum: ["customer", "admin"],
            default: "customer",
        },
    },
    {
        timestamps: true,
    },
);


// pre save hash password
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
}

const User = mongoose.model("User", userSchema);


export default User;