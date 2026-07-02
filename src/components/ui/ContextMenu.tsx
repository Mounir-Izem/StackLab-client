import React from 'react';
import {
    Modal, View, Text, Pressable, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../utils/theme';

export type ContextMenuAction = {
    label: string;
    icon: string;
    onPress: () => void;
    destructive?: boolean;
};

type Props = {
    visible: boolean;
    actions: ContextMenuAction[];
    onClose: () => void;
};

export function ContextMenu({ visible, actions, onClose }: Props) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
                    <View style={styles.handle} />
                    {actions.map((action, i) => (
                        <Pressable
                            key={i}
                            style={({ pressed }) => [
                                styles.row,
                                i < actions.length - 1 && styles.rowBorder,
                                pressed && styles.rowPressed,
                            ]}
                            onPress={() => { onClose(); action.onPress(); }}
                        >
                            <Ionicons
                                name={action.icon as any}
                                size={20}
                                color={action.destructive ? colors.crimson : colors.text}
                                style={styles.icon}
                            />
                            <Text style={[styles.label, action.destructive && styles.labelDestructive]}>
                                {action.label}
                            </Text>
                        </Pressable>
                    ))}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.60)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 10,
        paddingBottom: 32,
        borderTopWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignSelf: 'center',
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    rowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.07)',
    },
    rowPressed: {
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    icon: {
        marginRight: 14,
        width: 22,
    },
    label: {
        fontFamily: fonts.outfit,
        fontSize: 16,
        color: colors.text,
    },
    labelDestructive: {
        color: colors.crimson,
    },
});
